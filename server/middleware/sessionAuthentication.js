import User from "../modules/user/user.model.js";
import Admin from "../modules/admin/admin.model.js";
import { verifyAdminJWT } from "../modules/auth-admin/auth-admin.services.js";
import AppError from "../utils/appError.js";

async function findAdmin(token) {
    const id = await verifyAdminJWT(token);
    if (typeof id !== "string" || !/^[a-f0-9]{24}$/i.test(id)) return null;
    return Admin.findById(id);
}

export function requireSession(...roles) {
    return async (req, res, next) => {
        try {
            const bearer = req.headers.authorization?.match(/^Bearer\s+(\S+)$/i)?.[1];
            const candidates = [
                {
                    role: "student",
                    key: "user",
                    token: req.cookies?.token || bearer,
                    find: (token) => User.findByJWT(token),
                },
                {
                    role: "admin",
                    key: "admin",
                    token: req.cookies?.adminToken || bearer,
                    find: findAdmin,
                },
            ].sort((a, b) => Number(roles.includes(b.role)) - Number(roles.includes(a.role)));
            let authenticated = false;
            for (const candidate of candidates) {
                const actor =
                    req[candidate.key] ||
                    (candidate.token && (await candidate.find(candidate.token)));
                if (!actor) continue;
                // A shared account cannot establish an individual student session
                if (
                    candidate.role === "student" &&
                    actor.email?.toLowerCase() === "guest@coursehubiitg.in"
                )
                    continue;
                req[candidate.key] = actor;
                authenticated = true;
                if (roles.includes(candidate.role)) {
                    res.setHeader("Cache-Control", "private, no-store");
                    return next();
                }
            }
            return next(
                new AppError(
                    authenticated ? 403 : 401,
                    authenticated
                        ? "You do not have permission for this action"
                        : "Sign in to continue",
                ),
            );
        } catch (error) {
            return next(error);
        }
    };
}
