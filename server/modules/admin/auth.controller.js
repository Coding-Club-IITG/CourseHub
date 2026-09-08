import Admin from "./admin.model.js";
import AppError from "../../utils/appError.js";
import {
    createSession,
    setSessionCookie,
    revokeSession,
    clearSessionCookie,
} from "../../services/sessions.js";

export const adminLogin = async (req, res, next) => {
    const { userId, password } = req.body;
    if (
        typeof userId !== "string" ||
        !userId.trim() ||
        userId.length > 128 ||
        typeof password !== "string" ||
        !password ||
        password.length > 1024
    )
        return next(new AppError(400, "userId and password required"));

    const admin = await Admin.findOne({ userId: userId.trim() });
    if (!admin) return next(new AppError(401, "Invalid credentials"));

    const ok = await admin.comparePassword(password);
    if (!ok) return next(new AppError(401, "Invalid credentials"));

    const { token, session } = await createSession(admin._id, "admin");
    setSessionCookie(res, "admin", token);
    return res.json({ success: true, csrfToken: session.csrfToken });
};

export const adminLogout = async (req, res) => {
    await revokeSession(req.session);
    clearSessionCookie(res, "admin");
    return res.json({ success: true });
};

export const getAdmin = async (req, res, next) => {
    const admin = req.admin;
    if (!admin) return next(new AppError(500, "Something went wrong!"));
    return res.json({
        csrfToken: req.session.csrfToken,
        user: {
            userId: admin.userId,
            capabilities: { canManageAllCourses: true, canModerate: true },
        },
    });
};

export default { adminLogin, adminLogout, getAdmin };
