import isAdmin from "../../middleware/isAdmin.js";
import express from "express";

import {
    getAllStudents,
    getStudent,
    searchStudents,
    refreshStudentCourses,
    deleteStudent,
} from "./student.controller.js";

const router = express.Router();
router.use(isAdmin);

router.get("/all", getAllStudents);
router.get("/search", searchStudents);
router.get("/:id", getStudent);
router.put("/refresh/:id", refreshStudentCourses);
router.delete("/:id", deleteStudent);

export default router;
