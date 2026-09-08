import User from "../modules/user/user.model.js";
import Admin from "../modules/admin/admin.model.js";
import { readSession } from "../services/sessions.js";
import { cookieNames } from "../config/security.js";
import { checkCsrf } from "./csrf.js";
import AppError from "../utils/appError.js";

export function requireSession(...roles) {
    return async (req, res, next) => {
        try {
            const bearer = req.headers.authorization?.match(/^Bearer\s+(\S+)$/i)?.[1];
            const preferred = roles.includes(req.headers["x-session-role"])
                ? req.headers["x-session-role"]
                : roles[0];
            const candidates = ["student", "admin"].sort(
                (a, b) => Number(b === preferred) - Number(a === preferred),
            );
            let authenticated = false;
            req.sessions ||= {};
            for (const role of candidates) {
                const cookie = req.cookies?.[cookieNames[role]];
                const token = cookie || bearer;
                if (!token) continue;
                const session = req.sessions[role] || (await readSession(token, role));
                if (!session) continue;
                const key = role === "student" ? "user" : "admin";
                const actor =
                    req[key] ||
                    (await (role === "student" ? User : Admin).findById(session.actorId));
                if (
                    !actor ||
                    (role === "student" && actor.email?.toLowerCase() === "guest@coursehubiitg.in")
                )
                    continue;
                authenticated = true;
                req[key] = actor;
                req.sessions[role] = session;
                if (roles.includes(role)) {
                    checkCsrf(req, session, !!cookie);
                    req.session = session;
                    res.setHeader("Cache-Control", "private, no-store");
                    return next();
                }
            }
            throw new AppError(
                authenticated ? 403 : 401,
                authenticated
                    ? "You do not have permission for this action"
                    : "Sign in to continue",
            );
        } catch (error) {
            next(error);
        }
    };
}
