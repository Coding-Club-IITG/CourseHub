import isLibraryAuthenticated from "../../middleware/isLibraryAuthenticated.js";
import express from "express";
import { getAllCourses, getCourse } from "./course.controller.js";
import CourseModel from "./course.model.js";
import { normalizeCourseCode, getCourseCodeCaseInsensitiveRegex } from "../../utils/course.js";
import isAdmin from "../../middleware/isAdmin.js";
import logger from "../../utils/logger.js";
const router = express.Router();
router.use(isLibraryAuthenticated);

import catchAsync from "../../utils/catchAsync.js";
router.post("/create/:code", isAdmin, async (req, res) => {
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
        logger.error("Course creation failed", {
            error,
            attributes: {
                dependency: "mongodb",
                operation: "create-course",
                outcome: "failure",
                retryable: false,
            },
        });
        res.status(500).json({ message: "Server Error" });
    }
});
router.get("/", catchAsync(getAllCourses));
router.get("/:code", catchAsync(getCourse));

export default router;
