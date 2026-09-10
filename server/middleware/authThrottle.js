import { createHash } from "node:crypto";
import { model, Schema } from "../config/mongoose.js";
import AppError from "../utils/appError.js";

export const AuthRateLimit = model(
    "AuthRateLimit",
    new Schema({
        _id: String,
        count: Number,
        expiresAt: { type: Date, expires: 0 },
    }),
);

export function authThrottle(action) {
    return async (req, res, next) => {
        const seconds = Number(process.env.AUTH_RATE_WINDOW_SECONDS || 900);
        const limit = Number(process.env.AUTH_RATE_LIMIT || 20);
        if (!Number.isInteger(seconds) || seconds < 1 || !Number.isInteger(limit) || limit < 1)
            throw new Error("Invalid authentication throttling configuration");
        const window = Math.floor(Date.now() / (seconds * 1000));
        const expiresAt = new Date((window + 1) * seconds * 1000);
        const identities = [`ip:${req.ip}`];
        if (typeof req.body?.userId === "string")
            identities.push(`account:${req.body.userId.trim()}`);
        for (const identity of identities) {
            const _id = createHash("sha256")
                .update(`${action}:${window}:${identity}`)
                .digest("hex");
            let entry;
            try {
                entry = await AuthRateLimit.findOneAndUpdate(
                    { _id },
                    {
                        $inc: { count: 1 },
                        $setOnInsert: { expiresAt },
                    },
                    { upsert: true, returnDocument: "after" },
                );
            } catch (error) {
                if (error.code !== 11000) throw error;
                entry = await AuthRateLimit.findOneAndUpdate(
                    { _id },
                    { $inc: { count: 1 } },
                    { returnDocument: "after" },
                );
            }
            if (entry.count > limit) {
                res.setHeader(
                    "Retry-After",
                    Math.max(1, Math.ceil((expiresAt - Date.now()) / 1000)),
                );
                throw new AppError(
                    429,
                    "Too many sign-in attempts. Try again later.",
                    "AUTH_THROTTLED",
                );
            }
        }
        next();
    };
}
