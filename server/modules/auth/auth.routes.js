import express from "express";
const router = express.Router();
import isAuthenticated from "../../middleware/isAuthenticated.js";
import catchAsync from "../../utils/catchAsync.js";
import { authThrottle } from "../../middleware/authThrottle.js";
import { requireSession } from "../../middleware/sessionAuthentication.js";
import AppError from "../../utils/appError.js";
import {
    redirectHandler,
    loginHandler,
    logoutHandler,
    fetchCourses,
    fetchCoursesForBr,
} from "./auth.controller.js";

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

router.post("/fetchCourses", isAuthenticated, async (req, res, next) => {
    try {
        const rollNumber = req.user.rollNumber;
        if (
            req.body.rollNumber !== undefined &&
            String(req.body.rollNumber) !== String(rollNumber)
        ) {
            return res
                .status(403)
                .json({ error: true, message: "You may only refresh your own courses" });
        }
        const courses = await fetchCourses(rollNumber);
        res.json({ courses });
    } catch (err) {
        next(err);
    }
});

router.post("/fetchCoursesForBr", isAuthenticated, async (req, res, next) => {
    try {
        const rollNumber = req.user.rollNumber;
        if (
            req.body.rollNumber !== undefined &&
            String(req.body.rollNumber) !== String(rollNumber)
        ) {
            return res
                .status(403)
                .json({ error: true, message: "You may only refresh your own courses" });
        }
        const courses = await fetchCoursesForBr(rollNumber);
        res.json({ courses });
    } catch (error) {
        next(error);
    }
});

router.get("/login/redirect", authThrottle("student-callback"), catchAsync(redirectHandler));

router.post("/logout", isAuthenticated, catchAsync(logoutHandler));

export default router;
