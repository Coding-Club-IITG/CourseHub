import isAdmin from "../../middleware/isAdmin.js";
import express from "express";
import catchAsync from "../../utils/catchAsync.js";
import {
    getAllStudents,
    searchStudents,
    refreshStudentCourses,
    deleteStudent,
} from "./student.controller.js";

const router = express.Router();
router.use(isAdmin);

router.get("/all", catchAsync(getAllStudents));
router.get("/search", catchAsync(searchStudents));
router.put("/refresh/:id", catchAsync(refreshStudentCourses));
router.delete("/:id", catchAsync(deleteStudent));

export default router;
