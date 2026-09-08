import express from "express";
const router = express.Router();
import isAuthenticated from "../../middleware/isAuthenticated.js";
import catchAsync from "../../utils/catchAsync.js";
import {
    redirectHandler,
    loginHandler,
    logoutHandler,
    fetchCourses,
    fetchCoursesForBr,
} from "./auth.controller.js";

router.get("/login", loginHandler);

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

router.get("/login/redirect", catchAsync(redirectHandler));

router.get("/logout", logoutHandler);

export default router;
