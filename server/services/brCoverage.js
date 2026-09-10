import BR from "../modules/br/br.model.js";
import User from "../modules/user/user.model.js";
import Course from "../modules/course/course.model.js";
import CourseAllotment from "../modules/course/courseAllotment.model.js";
import { academicPeriod } from "./academicPeriod.js";
import { normalizeCourseCode } from "@coursehub/domain";
export async function coursesWithoutBR() {
    const registry = await BR.find().select("email").lean();
    const users = await User.find({ email: { $in: registry.map((item) => item.email) } })
        .collation({ locale: "en", strength: 2 })
        .select("rollNumber")
        .lean();
    const period = academicPeriod();
    const allotments = await CourseAllotment.find({
        rollNumber: { $in: users.map((user) => user.rollNumber) },
        session: { $in: ["Jan-May", "July-Nov"] },
        $or: [
            { year: { $lt: period.year } },
            {
                year: period.year,
                session: {
                    $in: period.session === "Jan-May" ? ["Jan-May"] : ["Jan-May", "July-Nov"],
                },
            },
        ],
    })
        .select("courses")
        .lean();
    const covered = new Set(allotments.flatMap((item) => item.courses.map(normalizeCourseCode)));
    const courses = await Course.find().select("_id code name").sort({ code: 1 }).lean();
    return {
        coursesWithoutBR: courses.filter(
            (course) => !covered.has(normalizeCourseCode(course.code)),
        ),
    };
}
