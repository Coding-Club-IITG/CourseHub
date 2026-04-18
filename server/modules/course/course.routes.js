import express from "express";
import {
    deleteCourseByCode,
    getAllCourses,
    getCourse,
    isCourseUpdated,
} from "./course.controller.js";
import CourseModel from "./course.model.js";
import { normalizeCourseCode, getCourseCodeCaseInsensitiveRegex } from "../../utils/course.js";
const router = express.Router();

import catchAsync from "../../utils/catchAsync.js";
import isAuthenticated from "../../middleware/isAuthenticated.js";
router.post("/create/:code", async (req, res) => {
    try {
        const { code } = req.params;
        const { name } = req.body;
        const normalizedCode = normalizeCourseCode(code);

        if (!normalizedCode) {
            return res.status(400).json({ message: "Invalid course code" });
        }

        const existingCourse = await CourseModel.findOne({
            code: getCourseCodeCaseInsensitiveRegex(normalizedCode),
        });

        if (existingCourse) {
            return res.status(200).json({ message: "Course already exists" });
        }

        const newCourse = new CourseModel({
            code: normalizedCode,
            name,
            children: [],
            metadata: {},
        });

        await newCourse.save();

        return res.status(201).json({ message: "Course created successfully", course: newCourse });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server Error" });
    }
});
router.get("/", catchAsync(getAllCourses));
router.get("/delete/:code", catchAsync(deleteCourseByCode));
router.post("/isUpdated", isAuthenticated, catchAsync(isCourseUpdated));
router.get("/:code", catchAsync(getCourse));

export default router;
