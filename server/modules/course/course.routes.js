import {
    assertCourseIdentityAvailable,
    validCourseCode,
    codeReferenceRegex,
} from "../../services/courseIdentity.js";
import isLibraryAuthenticated from "../../middleware/isLibraryAuthenticated.js";
import express from "express";
import { getAllCourses, getCourse } from "./course.controller.js";
import CourseModel from "./course.model.js";
import isAdmin from "../../middleware/isAdmin.js";
import { mutateContent } from "../../services/contentMutation.js";
const router = express.Router();
router.use(isLibraryAuthenticated);

router.post("/create/:code", isAdmin, async (req, res) => {
    return mutateContent(req, [req.params.code], async () => {
        const { code } = req.params;
        const { name } = req.body;
        const normalizedCode = validCourseCode(code);

        if (!normalizedCode) {
            return res.status(400).json({ message: "Invalid course code" });
        }

        const existingCourse = await CourseModel.findOne({
            code: codeReferenceRegex(normalizedCode),
        });

        if (existingCourse) {
            return res.status(200).json({ message: "Course already exists" });
        }

        await assertCourseIdentityAvailable(normalizedCode);
        const newCourse = new CourseModel({
            code: normalizedCode,
            name,
            children: [],
        });

        await newCourse.save();

        return res.status(201).json({ message: "Course created successfully", course: newCourse });
    });
});
router.get("/", getAllCourses);
router.get("/:code", getCourse);

export default router;
