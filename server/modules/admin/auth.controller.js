import Admin from "./admin.model.js";
import AppError from "../../utils/appError.js";
import { signAdminJWT } from "../auth-admin/auth-admin.services.js";

export const adminLogin = async (req, res, next) => {
    const { userId, password } = req.body;
    if (!userId || !password) return next(new AppError(400, "userId and password required"));

    const admin = await Admin.findOne({ userId });
    if (!admin) return next(new AppError(401, "Invalid credentials"));

    const ok = await admin.comparePassword(password);
    if (!ok) return next(new AppError(401, "Invalid credentials"));

    const token = await signAdminJWT(admin._id.toString());
    res.cookie("adminToken", token, {
        httpOnly: true,
        sameSite: "lax",
        secure: false,
        maxAge: 1000 * 60 * 60 * 24 * 7,
    });
    return res.json({ success: true });
};

export const adminLogout = async (req, res) => {
    res.clearCookie("adminToken");
    return res.json({ success: true });
};

export const getAdmin = async (req, res, next) => {
    const admin = req.admin;
    if (!admin) return next(new AppError(500, "Something went wrong!"));
    return res.json({
        user: {
            userId: admin.userId,
        },
    });
};

export default { adminLogin, adminLogout, getAdmin };
