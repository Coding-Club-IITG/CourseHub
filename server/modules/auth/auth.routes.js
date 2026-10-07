import express from "express";
const router = express.Router();
import catchAsync from "../../utils/catchAsync.js";
import isAuthenticated from "../../middleware/isAuthenticated.js";
import {
    redirectHandler,
    loginHandler,
    logoutHandler,
    guestLoginHanlder,
    fetchCourses,
    fetchPreviousCourses
} from "./auth.controller.js";

router.get("/login", loginHandler);
router.get("/login/guest", guestLoginHanlder);

router.post("/fetchCourses", async (req, res, next) => {
    try {
        const { rollNumber } = req.body;
        if (!rollNumber) return res.status(400).json({ error: "rollNumber required" });
        const courses = await fetchCourses(rollNumber);
        res.json({ courses });
    } catch (err) {
        next(err);
    }
});

router.post(["/fetchPreviousCourses", "/fetchCoursesForBr"], isAuthenticated, async (req, res, next) => {
    try {
        const { rollNumber } = req.user;
        if (!rollNumber) return res.status(400).json({ error: "rollNumber required" });
        const courses = await fetchPreviousCourses(rollNumber);
        res.json({ courses });
    } catch (error) {
        next(error);
    }
});

router.get("/login/redirect", catchAsync(redirectHandler));

router.get("/logout", logoutHandler);

export default router;
