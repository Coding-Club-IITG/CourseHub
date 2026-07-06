import express from "express";
import catchAsync from "../../utils/catchAsync.js";
import isAdmin from "../../middleware/isAdmin.js";
import {
    getAllStudents,
    searchStudents,
    refreshStudentCourses,
    deleteStudent,
    semesterReset,
} from "./student.controller.js";

const router = express.Router();

router.get("/all", isAdmin, catchAsync(getAllStudents));
router.get("/search", isAdmin, catchAsync(searchStudents));
router.put("/refresh/:id", isAdmin, catchAsync(refreshStudentCourses));
router.post("/semester-reset", isAdmin, catchAsync(semesterReset));
router.delete("/:id", isAdmin, catchAsync(deleteStudent));

export default router