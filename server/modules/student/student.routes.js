import isAdmin from "../../middleware/isAdmin.js";
import express from "express";
import catchAsync from "../../utils/catchAsync.js";
import {
    getAllStudents,
    searchStudents,
    refreshStudentCourses,
    deleteStudent,
    semesterReset,
} from "./student.controller.js";

const router = express.Router();
router.use(isAdmin);

router.get("/all", catchAsync(getAllStudents));
router.get("/search", catchAsync(searchStudents));
router.put("/refresh/:id", catchAsync(refreshStudentCourses));
router.post("/semester-reset", catchAsync(semesterReset));
router.delete("/:id", catchAsync(deleteStudent));

export default router;
