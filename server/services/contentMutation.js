import { libraryGraph } from "./authorization.js";
import { withCourseLocks } from "./courseLocks.js";
import { normalizeCourseCode } from "../utils/course.js";
import AppError from "../utils/appError.js";

export async function relatedCourses(req, codes) {
    const graph = await libraryGraph(req);
    const related = new Set(codes.filter(Boolean).map(normalizeCourseCode));
    const memberships = [...graph.folderCourses.values(), ...graph.fileCourses.values()];
    let changed = true;
    while (changed) {
        changed = false;
        for (const courses of memberships) {
            if (![...courses].some((code) => related.has(code))) continue;
            for (const code of courses)
                if (!related.has(code)) {
                    related.add(code);
                    changed = true;
                }
        }
    }
    return [...related].sort();
}

export async function mutateContent(req, codes, task) {
    const related = await relatedCourses(req, codes);
    return withCourseLocks(related, async (lock) => {
        req.authorizationGraph = undefined;
        req.authorizationVisibleFiles = undefined;
        req.operationId = lock.owner;
        try {
            await lock.assertHeld();
            const current = await relatedCourses(req, codes);
            if (current.some((code) => !related.includes(code)))
                throw new AppError(
                    409,
                    "Course sharing changed. Please retry the action.",
                    "COURSE_BUSY",
                );
            return await task(lock);
        } finally {
            delete req.operationId;
        }
    });
}
