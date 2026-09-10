import BR from "../modules/br/br.model.js";
import User from "../modules/user/user.model.js";
import CourseAllotment from "../modules/course/courseAllotment.model.js";
import { academicPeriod } from "./academicPeriod.js";
import { normalizeCourseCode } from "@coursehub/domain";
export async function coveredCourseCodes() {
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
    return [...new Set(allotments.flatMap((item) => item.courses.map(normalizeCourseCode)))];
}
