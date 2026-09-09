import express from "express";
const router = express.Router();
import isAuthenticated from "../../middleware/isAuthenticated.js";
import catchAsync from "../../utils/catchAsync.js";
import { authThrottle } from "../../middleware/authThrottle.js";
import { requireSession } from "../../middleware/sessionAuthentication.js";
import AppError from "../../utils/appError.js";
import { redirectHandler, loginHandler, logoutHandler } from "./auth.controller.js";

router.get("/login", authThrottle("student-login"), catchAsync(loginHandler));
router.get(
    "/csrf",
    (req, res, next) => {
        const role = req.query.role;
        if (!["student", "admin"].includes(role))
            return next(new AppError(400, "Invalid session role"));
        requireSession(role)(req, res, next);
    },
    (req, res) => res.json({ csrfToken: req.session.csrfToken }),
);

router.get("/login/redirect", authThrottle("student-callback"), catchAsync(redirectHandler));

router.post("/logout", isAuthenticated, catchAsync(logoutHandler));

export default router;
