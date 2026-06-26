import User from "../user/user.model.js";
import { fetchCoursesForBr } from "../auth/auth.controller.js";
import logger from "../../utils/logger.js";

// GET /api/student/all?isBR=true
// Returns every student, sorted by rollNumber descending.
// If isBR=true is passed, only returns students who are Branch Representatives.
const getAllStudents = async (req, res) => {
    try {
        const { isBR } = req.query;
        const filter = isBR === "true" ? { isBR: true } : {};

        const students = await User.find(filter).sort({ rollNumber: -1 });
        res.status(200).json({ students });
    } catch (error) {
        logger.error(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

// GET /api/student/search?q=...&isBR=true
// Searches students by name or rollNumber using a MongoDB $or regex query.
// If isBR=true is passed, results are additionally restricted to Branch Representatives.
// Results are still sorted by rollNumber descending.
const searchStudents = async (req, res) => {
    try {
        const { q = "", isBR } = req.query;
        const brFilter = isBR === "true" ? { isBR: true } : {};

        if (!q.trim()) {
            const students = await User.find(brFilter).sort({ rollNumber: -1 });
            return res.status(200).json({ students });
        }

        const searchRegex = new RegExp(q, "i");
        const orConditions = [{ name: { $regex: searchRegex } }];

        // rollNumber is stored as a Number, so only add a numeric match
        // if the query looks like a number (partial roll number searches
        // like "2210" are matched via regex against the stringified field
        // using $expr, since Mongo can't $regex a Number field directly).
        orConditions.push({
            $expr: {
                $regexMatch: {
                    input: { $toString: "$rollNumber" },
                    regex: q,
                    options: "i",
                },
            },
        });

        const students = await User.find({ ...brFilter, $or: orConditions }).sort({ rollNumber: -1 });
        res.status(200).json({ students });
    } catch (error) {
        logger.error(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

// PUT /api/student/refresh/:id
const refreshStudentCourses = async (req, res) => {
    try {
        const { id } = req.params;
        const student = await User.findById(id);
        if (!student) return res.status(404).json({ error: "Student not found" });

        await fetchCoursesForBr(student.rollNumber);
        res.status(200).json({ message: "Courses refreshed successfully" });
    } catch (error) {
        logger.error(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

// DELETE /api/student/:id
const deleteStudent = async (req, res) => {
    try {
        const { id } = req.params;
        const student = await User.findByIdAndDelete(id);
        if (!student) return res.status(404).json({ error: "Student not found" });

        res.status(200).json({ message: "Student deleted successfully" });
    } catch (error) {
        logger.error(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

// POST /api/student/semester-reset
const semesterReset = async (req, res) => {
    try {
        const result = await User.updateMany({}, { $set: { courses: [] } });
        res.status(200).json({
            message: "Semester reset successful. All student courses cleared.",
            modifiedCount: result.modifiedCount,
        });
    } catch (error) {
        logger.error(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

export { getAllStudents, searchStudents, refreshStudentCourses, deleteStudent, semesterReset };