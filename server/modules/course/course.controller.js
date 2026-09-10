import Course from "./course.model.js";
import { presentCourse } from "../../services/authorization.js";
import logger from "../../utils/logger.js";
export const getCourse = async (req, res) => {
    const course = await presentCourse(req, req.params.code);
    logger.metric?.("course_opened", {
        value: 1,
        dimensions: {
            courseCode: course.code,
            userEmail: req.user?.email || req.admin?.userId,
            department: req.user?.department || "unknown",
            semester: req.user?.semester || 0,
        },
    });
    res.json({ found: true, ...course });
};
export const getAllCourses = async (req, res) =>
    res.json(await Course.find().select("_id name code"));
