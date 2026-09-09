import User from "../user/user.model.js";
import { scheduleStudentSync } from "../../services/academicSync.js";
import { resourceId } from "../../services/authorization.js";
import AppError from "../../utils/appError.js";
import logger from "../../utils/logger.js";
import BR from "../br/br.model.js";
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
        logger.error("Student query failed", {
            error,
            attributes: {
                dependency: "mongodb",
                operation: "query-students",
                outcome: "failure",
                retryable: false,
            },
        });
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

        const students = await User.find({ ...brFilter, $or: orConditions }).sort({
            rollNumber: -1,
        });
        res.status(200).json({ students });
    } catch (error) {
        logger.error("Student search failed", {
            error,
            attributes: {
                dependency: "mongodb",
                operation: "search-students",
                outcome: "failure",
                retryable: false,
            },
        });
        res.status(500).json({ error: "Internal Server Error" });
    }
};

const refreshStudentCourses = async (req, res) => {
    const student = await User.findById(resourceId(req.params.id));
    if (!student) throw new AppError(404, "Student not found");
    res.status(202).json(
        await scheduleStudentSync(student, {
            actorId: req.admin._id,
            actorRole: "admin",
            force: true,
        }),
    );
};

// DELETE /api/student/:id
// Permanently deletes a student document.
const deleteStudent = async (req, res) => {
    try {
        const { id } = req.params;
        const student = await User.findByIdAndDelete(id);
        if (!student) return res.status(404).json({ error: "Student not found" });
        res.status(200).json({ message: "Student deleted successfully" });
    } catch (error) {
        logger.error("Student deletion failed", {
            error,
            attributes: {
                dependency: "mongodb",
                operation: "delete-student",
                outcome: "failure",
                retryable: false,
            },
        });
        res.status(500).json({ error: "Internal Server Error" });
    }
};

export { getAllStudents, searchStudents, refreshStudentCourses, deleteStudent };
