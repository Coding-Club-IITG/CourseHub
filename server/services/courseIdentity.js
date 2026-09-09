import Course from "../modules/course/course.model.js";
import CourseIdentity from "../modules/course/courseIdentity.model.js";
import { normalizeCourseCode } from "../utils/course.js";
import AppError from "../utils/appError.js";

export const identityLock = "!COURSE-IDENTITIES";
export function validCourseCode(value) {
    if (typeof value !== "string")
        throw new AppError(400, "A valid course code is required", "INVALID_COURSE_CODE");
    const code = normalizeCourseCode(value);
    if (!/^[A-Z0-9][A-Z0-9._-]{0,63}$/.test(code))
        throw new AppError(
            400,
            "Use letters, numbers, dots, underscores or hyphens in the course code",
            "INVALID_COURSE_CODE",
        );
    return code;
}
export function codeReferenceRegex(value) {
    const code = normalizeCourseCode(value);
    if (!code || code.length > 100) throw new AppError(400, "A valid course code is required");
    const escaped = [...code].map((char) => char.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    return new RegExp(`^\\s*${escaped.join("\\s*")}\\s*$`, "i");
}
export async function assertCourseIdentityAvailable(code, courseId) {
    code = validCourseCode(code);
    const [identity, courses] = await Promise.all([
        CourseIdentity.findById(code).lean(),
        Course.find({ $or: [{ code: codeReferenceRegex(code) }, { aliases: code }] })
            .select("_id")
            .lean(),
    ]);
    if (
        (identity && (identity.retired || String(identity.courseId) !== String(courseId))) ||
        courses.some((course) => String(course._id) !== String(courseId))
    )
        throw new AppError(
            409,
            "This course code is already in use or reserved by an earlier course",
            "COURSE_CODE_CONFLICT",
        );
}
export async function rememberCourseCodes(courseId, codes, retired = false) {
    for (const code of new Set(codes.map(normalizeCourseCode))) {
        const result = await CourseIdentity.updateOne(
            { _id: code, courseId },
            { $set: { retired }, $setOnInsert: { courseId } },
            { upsert: true },
        );
        if (!result.acknowledged) throw new AppError(503, "Course identity could not be saved");
    }
}
export async function resolveAcademicCodes(values) {
    const codes = [...new Set(values.map(validCourseCode))];
    const [identities, courses] = await Promise.all([
        CourseIdentity.find({ _id: { $in: codes } }).lean(),
        Course.find().select("_id code name aliases changingOperation deletingOperation").lean(),
    ]);
    const byId = new Map(courses.map((course) => [String(course._id), course]));
    const byCode = new Map();
    for (const course of courses) {
        for (const value of [course.code, ...(course.aliases || [])]) {
            const code = normalizeCourseCode(value);
            if (byCode.has(code) && String(byCode.get(code)._id) !== String(course._id))
                throw new AppError(
                    409,
                    "Duplicate course identities require review",
                    "COURSE_CODE_CONFLICT",
                );
            byCode.set(code, course);
        }
    }
    const registry = new Map(identities.map((entry) => [entry._id, entry]));
    return new Map(
        codes.map((code) => {
            const identity = registry.get(code);
            const course = identity ? byId.get(String(identity.courseId)) : byCode.get(code);
            if (identity?.retired) return [code, null];
            if (identity && !course)
                throw new AppError(
                    409,
                    "A course identity requires repair",
                    "COURSE_IDENTITY_DANGLING",
                );
            if (course?.deletingOperation || course?.changingOperation)
                throw new AppError(409, "A course change is in progress", "COURSE_BUSY");
            return [
                code,
                course ? { ...course, code: normalizeCourseCode(course.code) } : { code },
            ];
        }),
    );
}
