import isLibraryAuthenticated from "../../middleware/isLibraryAuthenticated.js";
import express from "express";
import { getAllCourses, getCourse } from "./course.controller.js";
import CourseModel from "./course.model.js";
import { normalizeCourseCode, getCourseCodeCaseInsensitiveRegex } from "../../utils/course.js";
import isAdmin from "../../middleware/isAdmin.js";
import { mutateContent } from "../../services/contentMutation.js";
const router = express.Router();
router.use(isLibraryAuthenticated);

import catchAsync from "../../utils/catchAsync.js";
router.post(
    "/create/:code",
    isAdmin,
    catchAsync(async (req, res) => {
        return mutateContent(req, [req.params.code], async () => {
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

            return res
                .status(201)
                .json({ message: "Course created successfully", course: newCourse });
        });
    }),
);
router.get("/", catchAsync(getAllCourses));
router.get("/:code", catchAsync(getCourse));

export default router;
