import { identityLock } from "./courseIdentity.js";
import { libraryGraph } from "./authorization.js";
import { assertValidCourseTree, treeCodes } from "./folderTrees.js";
import { withCourseLocks } from "./courseLocks.js";
import { normalizeCourseCode } from "../utils/course.js";
import AppError from "../utils/appError.js";

export async function relatedCourses(req, codes) {
    const graph = await libraryGraph(req);
    const related = new Set(
        codes
            .filter(Boolean)
            .map(
                (code) =>
                    graph.aliases?.get(normalizeCourseCode(code)) || normalizeCourseCode(code),
            ),
    );
    const memberships = [
        ...graph.folderCourses.values(),
        ...graph.fileCourses.values(),
        ...[...graph.folders.values()].map((folder) => new Set(treeCodes(folder.courses))),
    ];
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
    for (const code of related) assertValidCourseTree(graph, code);
    return [...related].sort();
}

export async function mutateContent(req, codes, task) {
    const related = [identityLock, ...(await relatedCourses(req, codes))];
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
