import User from "../user/user.model.js";
import { scheduleStudentSync } from "../../services/academicSync.js";
import { resourceId } from "../../services/authorization.js";
import { listStudents, studentDetails } from "../../services/studentAdministration.js";
import AppError from "../../utils/appError.js";
const getAllStudents = async (req, res) => res.json(await listStudents(req.query));
const searchStudents = getAllStudents;
const getStudent = async (req, res) => res.json(await studentDetails(resourceId(req.params.id)));
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
const deleteStudent = async (req, res) => {
    const student = await User.findByIdAndDelete(resourceId(req.params.id));
    if (!student) throw new AppError(404, "Student not found");
    res.json({ message: "Student deleted successfully" });
};
export { getAllStudents, searchStudents, getStudent, refreshStudentCourses, deleteStudent };
