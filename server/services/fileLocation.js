import { libraryGraph, requireFile, requireCourse, presentFile } from "./authorization.js";
import { normalizeCourseCode } from "../utils/course.js";
import { treeId } from "./folderTrees.js";
import AppError from "../utils/appError.js";

// Resolve names and navigation from the current authorized tree
export async function resolveFileLocation(
    req,
    id,
    preferredCode,
    { allowOtherCourse = false } = {},
) {
    const context = await requireFile(req, id, allowOtherCourse ? undefined : preferredCode);
    const graph = await libraryGraph(req);
    const normalized = normalizeCourseCode(preferredCode);
    const preferred = graph.aliases.get(normalized) || normalized;
    const code = context.affectedCourses.includes(preferred)
        ? preferred
        : context.affectedCourses[0];
    const { course } = await requireCourse(req, code);
    const pending = course.children.map((value) => ({ id: treeId(value), names: [] })).reverse();
    const visited = new Set();
    while (pending.length) {
        const current = pending.pop();
        if (visited.has(current.id) || !graph.folderCourses.get(current.id)?.has(code)) continue;
        visited.add(current.id);
        const folder = graph.folders.get(current.id);
        const names = [...current.names, folder.name];
        if (folder.childType === "File") {
            if (folder.children.some((value) => treeId(value) === treeId(context.file)))
                return {
                    file: await presentFile(req, context.file, code),
                    code,
                    folderId: current.id,
                    path: names.join(" / "),
                };
        } else {
            for (const value of [...folder.children].reverse())
                pending.push({ id: treeId(value), names });
        }
    }
    throw new AppError(404, "File not found");
}
