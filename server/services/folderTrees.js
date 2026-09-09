import Course, { FolderModel, FileModel } from "../modules/course/course.model.js";
import { normalizeCourseCode } from "../utils/course.js";
import AppError from "../utils/appError.js";

export const treeLimits = Object.freeze({ depth: 64, nodes: 10000 });
export const treeId = (value) => String(value?._id || value);
export const treeCodes = (values = []) => [
    ...new Set((Array.isArray(values) ? values : []).map(normalizeCourseCode).filter(Boolean)),
];
const fail = (code) => {
    throw new AppError(409, "This course tree requires repair before it can be used", code);
};

// Traversal contract for membership, presentation, removal and linking
export function walkFolderTree(graph, roots, code, { operationId } = {}) {
    const folders = new Set(),
        files = new Set(),
        order = [],
        visiting = new Set();
    const heights = new Map(),
        sizes = new Map();
    const visit = (value, depth) => {
        const id = treeId(value),
            folder = graph.folders.get(id);
        if (!folder) fail("TREE_DANGLING_REFERENCE");
        if (!Array.isArray(folder.courses)) fail("TREE_INVALID_STRUCTURE");
        if (
            !treeCodes(folder.courses).includes(code) ||
            (folder.deletingOperation && folder.deletingOperation !== operationId)
        )
            return 0;
        if (visiting.has(id)) fail("TREE_CYCLE");
        if (depth + (heights.get(id) || 1) - 1 > treeLimits.depth) fail("TREE_DEPTH_EXCEEDED");
        if (folders.has(id)) return heights.get(id);
        if (folders.size >= treeLimits.nodes) fail("TREE_TOO_LARGE");
        if (!["Folder", "File"].includes(folder.childType) || !Array.isArray(folder.children))
            fail("TREE_INVALID_STRUCTURE");
        folders.add(id);
        visiting.add(id);
        let height = 1,
            size = 1;
        for (const child of new Set(folder.children.map(treeId))) {
            if (folder.childType === "Folder") {
                const childHeight = visit(child, depth + 1);
                if (childHeight) {
                    height = Math.max(height, childHeight + 1);
                    size += sizes.get(child);
                }
            } else {
                if (!graph.files.has(child)) fail("TREE_DANGLING_REFERENCE");
                files.add(child);
                size++;
            }
            if (size > treeLimits.nodes || files.size > treeLimits.nodes) fail("TREE_TOO_LARGE");
        }
        visiting.delete(id);
        heights.set(id, height);
        sizes.set(id, size);
        order.push(id);
        return height;
    };
    let expanded = 0;
    for (const root of new Set(roots.map(treeId))) {
        if (visit(root, 1)) expanded += sizes.get(root);
        if (expanded > treeLimits.nodes) fail("TREE_TOO_LARGE");
    }
    return { folders, files, order };
}

export function buildLibraryGraph(courses, folders, files, { operationId } = {}) {
    const graph = {
        courses: new Map(),
        aliases: new Map(),
        folders: new Map(folders.map((f) => [treeId(f), f])),
        files: new Set(files.map(treeId)),
        folderCourses: new Map(),
        fileCourses: new Map(),
        errors: new Map(),
    };
    for (const course of courses) {
        const code = normalizeCourseCode(course.code);
        if (graph.courses.has(code))
            graph.errors.set(
                code,
                new AppError(
                    409,
                    "Duplicate course identity requires repair",
                    "TREE_DUPLICATE_COURSE",
                ),
            );
        graph.courses.set(code, course);
    }
    for (const [code, course] of graph.courses) {
        for (const alias of course.aliases || []) {
            const normalized = normalizeCourseCode(alias);
            if (
                (graph.courses.has(normalized) && normalized !== code) ||
                (graph.aliases.has(normalized) && graph.aliases.get(normalized) !== code)
            ) {
                const error = new AppError(
                    409,
                    "Conflicting course aliases require repair",
                    "TREE_DUPLICATE_COURSE",
                );
                graph.errors.set(code, error);
                graph.errors.set(normalized, error);
            } else graph.aliases.set(normalized, code);
        }
    }
    const add = (map, id, code) => {
        if (!map.has(id)) map.set(id, new Set());
        map.get(id).add(code);
    };
    for (const [code, course] of graph.courses) {
        if (
            graph.errors.has(code) ||
            (course.deletingOperation && course.deletingOperation !== operationId) ||
            (course.changingOperation && course.changingOperation !== operationId)
        )
            continue;
        try {
            if (!Array.isArray(course.children)) fail("TREE_INVALID_STRUCTURE");
            const tree = walkFolderTree(graph, course.children, code, { operationId });
            for (const id of tree.folders) add(graph.folderCourses, id, code);
            for (const id of tree.files) add(graph.fileCourses, id, code);
        } catch (error) {
            graph.errors.set(code, error);
        }
    }
    return graph;
}

export async function loadLibraryGraph(options) {
    const [courses, folders, files] = await Promise.all([
        Course.find()
            .select(
                "_id code name children books createdAt updatedAt deletingOperation changingOperation aliases",
            )
            .lean(),
        FolderModel.find().select("_id name courses childType children deletingOperation").lean(),
        FileModel.find().select("_id").lean(),
    ]);
    return buildLibraryGraph(courses, folders, files, options);
}

export function assertValidCourseTree(graph, code) {
    if (graph.errors.has(code)) throw graph.errors.get(code);
}

export function validateTreeChange(graph, { folders = [], courses = [] }, codes) {
    const next = { ...graph, folders: new Map(graph.folders), courses: new Map(graph.courses) };
    for (const folder of folders) next.folders.set(treeId(folder), folder);
    for (const course of courses) next.courses.set(normalizeCourseCode(course.code), course);
    for (const code of codes) {
        const course = next.courses.get(code);
        if (course) walkFolderTree(next, course.children, code);
    }
}
