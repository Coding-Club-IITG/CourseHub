import User from "../user/user.model.js";
import UserUpdate from "../user/userUpdate.model.js";
import logger from "../../utils/logger.js";
import BR from "../br/br.model.js"
// GET /api/student/all?isBR=true
// Returns every student sorted by rollNumber descending.
// Pass isBR=true to only return Branch Representatives.
const getAllStudents = async (req, res) => {
    try {
        const { isBR } = req.query;
        const filter = isBR === "true" ? { isBR: true } : {};
        const students = await User.find(filter).sort({ rollNumber: -1 });
        res.status(200).json({ students });
    } catch (error) {
        logger.error("Student query failed", { error, attributes: { dependency: "mongodb", operation: "query-students", outcome: "failure", retryable: false } });
        res.status(500).json({ error: "Internal Server Error" });
    }
};

// GET /api/student/search?q=...&isBR=true
// Searches by name or rollNumber using $or regex.
// Pass isBR=true to restrict results to Branch Representatives.
const searchStudents = async (req, res) => {
    try {
        const { q = "", isBR } = req.query;
        const brFilter = isBR === "true" ? { isBR: true } : {};

        if (!q.trim()) {
            const students = await User.find(brFilter).sort({ rollNumber: -1 });
            return res.status(200).json({ students });
        }

        const searchRegex = new RegExp(q, "i");
        const orConditions = [
            { name: { $regex: searchRegex } },
            {
                $expr: {
                    $regexMatch: {
                        input: { $toString: "$rollNumber" },
                        regex: q,
                        options: "i",
                    },
                },
            },
        ];

        const students = await User.find({ ...brFilter, $or: orConditions }).sort({ rollNumber: -1 });
        res.status(200).json({ students });
    } catch (error) {
        logger.error("Student search failed", { error, attributes: { dependency: "mongodb", operation: "search-students", outcome: "failure", retryable: false } });
        res.status(500).json({ error: "Internal Server Error" });
    }
};

// PUT /api/student/refresh/:id
// Deletes the student's UserUpdate record so their courses are safely
// re-fetched from the academic portal on their next login.
// (Per issue #144 — directly calling fetchCoursesForBr would block the
// server for 30-40s and only update previousCourses, not current courses.)
const refreshStudentCourses = async (req, res) => {
    try {
        const { id } = req.params;
        const student = await User.findById(id);
        if (!student) return res.status(404).json({ error: "Student not found" });

        await UserUpdate.deleteOne({ rollNumber: student.rollNumber });

        res.status(200).json({
            message: "Student update record reset successfully. Courses will be re-fetched on next login.",
        });
    } catch (error) {
        logger.error("Student refresh failed", { error, attributes: { dependency: "mongodb", operation: "refresh-student", outcome: "failure", retryable: false } });
        res.status(500).json({ error: "Internal Server Error" });
    }
};

// DELETE /api/student/:id
// Permanently deletes a student document.
const deleteStudent = async (req, res) => {
    try {
        const { id } = req.params;
        const student = await User.findByIdAndDelete(id);
        if (!student) return res.status(404).json({ error: "Student not found" });
        await UserUpdate.deleteOne({rollNumber:student.rollNumber});
        res.status(200).json({ message: "Student deleted successfully" });
    } catch (error) {
        logger.error("Student deletion failed", { error, attributes: { dependency: "mongodb", operation: "delete-student", outcome: "failure", retryable: false } });
        res.status(500).json({ error: "Internal Server Error" });
    }
};

// POST /api/student/semester-reset
// Deletes all UserUpdate tracking records (forcing re-fetch on next login)
// and atomically clears the courses array on every User document.
const semesterReset = async (req, res) => {
    try {
        // Delete all user update tracking logs so the SSO scraper runs again
        await UserUpdate.deleteMany({});

        // Clear current course associations
        const result = await User.updateMany({}, { $set: { courses: [] } });

        res.status(200).json({
            message: "Semester reset successful. All student updates cleared and course lists reset.",
            modifiedCount: result.modifiedCount,
        });
    } catch (error) {
        logger.error("Semester reset failed", { error, attributes: { dependency: "mongodb", operation: "semester-reset", outcome: "failure", retryable: false } });
        res.status(500).json({ error: "Internal Server Error" });
    }
};

export { getAllStudents, searchStudents, refreshStudentCourses, deleteStudent, semesterReset };
