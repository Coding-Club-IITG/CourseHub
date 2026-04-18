const normalizeCourseCacheCode = (code) =>
    code?.toString()?.replace(/\s+/g, "")?.toLowerCase() || "";

const getTreeSize = (course) => (Array.isArray(course?.children) ? course.children.length : -1);

export const hasUsableCourseTree = (course) =>
    Array.isArray(course?.children) && course.children.length > 0;

export const sanitizeCourseCache = (courses) => {
    if (!Array.isArray(courses)) return [];

    const byCode = new Map();
    for (const course of courses) {
        if (!course || typeof course !== "object") continue;
        if (!course.code || !Array.isArray(course.children)) continue;

        const normalizedCode = normalizeCourseCacheCode(course.code);
        if (!normalizedCode) continue;

        const existing = byCode.get(normalizedCode);
        if (!existing || getTreeSize(course) >= getTreeSize(existing)) {
            byCode.set(normalizedCode, course);
        }
    }

    return Array.from(byCode.values());
};

export const findCachedCourse = (courses, code) => {
    if (!Array.isArray(courses)) return null;

    const normalizedCode = normalizeCourseCacheCode(code);
    if (!normalizedCode) return null;

    const matches = courses.filter(
        (course) => normalizeCourseCacheCode(course?.code) === normalizedCode
    );
    if (matches.length === 0) return null;

    const bestMatch = matches.reduce((best, current) =>
        getTreeSize(current) >= getTreeSize(best) ? current : best
    );

    return hasUsableCourseTree(bestMatch) ? bestMatch : null;
};

