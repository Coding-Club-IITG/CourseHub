import { randomBytes } from "node:crypto";
import { model, Schema } from "../config/mongoose.js";
import { cookieOptions } from "../config/security.js";
import config from "../config/default.js";
import AppError from "../utils/appError.js";
import { createOAuthProof, hashOAuthValue as hash } from "../utils/oauthProof.js";

export const OAuthAttempt = model(
    "OAuthAttempt",
    new Schema({
        _id: String,
        bindingHash: String,
        verifier: String,
        returnTo: String,
        expiresAt: { type: Date, expires: 0 },
    }),
);
const flowCookie = "coursehubOAuth";
const flowOptions = () => ({ ...cookieOptions(), sameSite: "lax", path: "/api/auth" });
export const oauthEndpoint = (part) =>
    `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID || "850aa78d-94e1-4bc6-9cf3-8c11b530701c"}/oauth2/v2.0/${part}`;

export function safeReturnTo(value) {
    if (
        typeof value !== "string" ||
        value.length > 2048 ||
        !value.startsWith("/") ||
        value.startsWith("//") ||
        /[\\\r\n]/.test(value)
    )
        return "/dashboard";
    const base = new URL(config.clientURL);
    const target = new URL(value, base);
    if (target.origin !== base.origin || target.pathname.startsWith("/api/")) return "/dashboard";
    return target.pathname + target.search + target.hash;
}

export async function beginOAuth(req, res) {
    const { state, verifier, challenge } = createOAuthProof();
    const binding = randomBytes(32).toString("base64url");
    await OAuthAttempt.create({
        _id: hash(state),
        bindingHash: hash(binding),
        verifier,
        returnTo: safeReturnTo(req.query.returnTo),
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });
    res.cookie(flowCookie, binding, { ...flowOptions(), maxAge: 10 * 60 * 1000 });
    const url = new URL(oauthEndpoint("authorize"));
    url.search = new URLSearchParams({
        client_id: process.env.AZURE_CLIENT_ID,
        response_type: "code",
        redirect_uri: process.env.REDIRECT_URI,
        scope: "user.read",
        state,
        code_challenge: challenge,
        code_challenge_method: "S256",
    }).toString();
    res.setHeader("Cache-Control", "no-store");
    res.redirect(url.href);
}

export async function consumeOAuth(req, res) {
    res.clearCookie(flowCookie, flowOptions());
    const { state } = req.query;
    const binding = req.cookies?.[flowCookie];
    if (
        typeof state !== "string" ||
        !/^[\w-]{43}$/.test(state) ||
        typeof binding !== "string" ||
        !/^[\w-]{43}$/.test(binding)
    )
        throw new AppError(
            400,
            "Sign-in expired or could not be verified. Start again.",
            "OAUTH_STATE_INVALID",
        );
    const attempt = await OAuthAttempt.findOneAndDelete({
        _id: hash(state),
        bindingHash: hash(binding),
        expiresAt: { $gt: new Date() },
    });
    if (!attempt)
        throw new AppError(
            400,
            "Sign-in expired or could not be verified. Start again.",
            "OAUTH_STATE_INVALID",
        );
    if (
        req.query.error ||
        typeof req.query.code !== "string" ||
        !req.query.code ||
        req.query.code.length > 2048
    )
        throw new AppError(400, "Sign-in was not completed. Start again.", "OAUTH_CANCELLED");
    return attempt;
}
