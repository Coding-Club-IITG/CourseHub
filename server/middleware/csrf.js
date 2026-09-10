import { timingSafeEqual } from "node:crypto";
import { allowedOrigins } from "../config/security.js";
import AppError from "../utils/appError.js";

export const isMutation = (req) => !["GET", "HEAD", "OPTIONS"].includes(req.method);
export function trustedOrigin(req) {
    if (req.headers.origin) return allowedOrigins().has(req.headers.origin);
    try {
        return allowedOrigins().has(new URL(req.headers.referer).origin);
    } catch {
        return false;
    }
}
export function requireTrustedOrigin(req, res, next) {
    if (!trustedOrigin(req))
        return next(new AppError(403, "Request origin is not allowed", "ORIGIN_DENIED"));
    next();
}
export function checkCsrf(req, session, usesCookie) {
    if (!isMutation(req) || !usesCookie) return;
    if (!trustedOrigin(req))
        throw new AppError(403, "Request origin is not allowed", "ORIGIN_DENIED");
    const supplied = req.headers["x-csrf-token"];
    const expected = session.csrfToken;
    if (
        typeof supplied !== "string" ||
        !/^[A-Za-z0-9_-]{43}$/.test(supplied) ||
        supplied.length !== expected.length ||
        !timingSafeEqual(Buffer.from(supplied), Buffer.from(expected))
    )
        throw new AppError(403, "Refresh your session and try again", "CSRF_INVALID");
}
