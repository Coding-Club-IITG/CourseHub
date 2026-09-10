import { StorageLease } from "../modules/operation/operation.model.js";
import AppError from "../utils/appError.js";

export async function acquireStorageLease(kind, owner, count, durationMs) {
    for (let index = 0; index < count; index++) {
        try {
            const lease = await StorageLease.findOneAndUpdate(
                { _id: `${kind}:${index}`, $or: [{ owner }, { expiresAt: { $lte: new Date() } }] },
                {
                    $set: {
                        owner,
                        expiresAt: durationMs ? new Date(Date.now() + durationMs) : null,
                    },
                },
                { upsert: true, returnDocument: "after" },
            );
            return lease._id;
        } catch (error) {
            if (error.code !== 11000) throw error;
        }
    }
    throw new AppError(409, "Storage is busy, retry shortly", "STORAGE_BUSY");
}

export const releaseStorageLease = (owner) => StorageLease.deleteMany({ owner });
