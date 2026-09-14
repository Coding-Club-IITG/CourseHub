import Course, { FolderModel, FileModel } from "../modules/course/course.model.js";
import { normalizeCourseCode } from "../utils/course.js";
import {
    buildLibraryGraph,
    loadLibraryGraph,
    treeCodes,
    treeId,
    treeLimits,
} from "./folderTrees.js";

const folderFields = "_id name courses childType children deletingOperation";
const courseFields =
    "_id code name children books createdAt updatedAt deletingOperation changingOperation aliases";
const identitySignature = (course) => JSON.stringify([course.code, course.aliases || []]);
const objectIds = (values) => [...values].filter((id) => /^[a-f0-9]{24}$/i.test(id));

// Read a resource's trees using indexed IDs
export async function loadResourceGraph({
    courseCode,
    courseCodes = [],
    folderId,
    fileId,
    fileIds: requestedFileIds,
}) {
    const courses = await Course.find().select("_id code aliases").lean();
    const identities = buildLibraryGraph(courses, [], [], { courseCodes: new Set() });
    const positions = new Map(courses.map((course, index) => [course, index]));
    const selected = new Set();
    const folders = new Map();
    const fileIds = new Set();
    const files = new Map();
    const addCodes = (values) => {
        for (const code of treeCodes(values)) if (identities.courses.has(code)) selected.add(code);
    };
    const fileParents = (ids) =>
        FolderModel.find({
            childType: "File",
            children: { $in: objectIds(ids) },
        })
            .select("courses")
            .lean();

    for (const value of [...courseCodes, ...(courseCode ? [courseCode] : [])]) {
        const normalized = normalizeCourseCode(value);
        selected.add(identities.aliases.get(normalized) || normalized);
    }
    if (folderId) {
        const folder = await FolderModel.findById(folderId).select(folderFields).lean();
        if (folder) {
            folders.set(treeId(folder), folder);
            addCodes(folder.courses);
        }
    }
    const requestedFiles = [...new Set([...(requestedFileIds || []), ...(fileId ? [fileId] : [])])];
    if (requestedFiles.length)
        for (const parent of await fileParents(requestedFiles)) addCodes(parent.courses);

    const loadTrees = async (codes) => {
        const wanted = [...codes]
            .filter((code) => !identities.errors.has(code))
            .map((code) => identities.courses.get(code))
            .filter(Boolean);
        if (wanted.length) {
            const documents = await Course.find({ _id: { $in: wanted.map(treeId) } })
                .select(courseFields)
                .lean();
            const byId = new Map(documents.map((course) => [treeId(course), course]));
            for (const identity of wanted) {
                const course = byId.get(treeId(identity));
                // A rename or deletion between reads needs the complete validator
                if (!course || identitySignature(course) !== identitySignature(identity))
                    return false;
                courses[positions.get(identity)] = course;
                identities.courses.set(normalizeCourseCode(course.code), course);
            }
        }
        let pending = new Map();
        const visited = new Map([...codes].map((code) => [code, new Set()]));
        const enqueue = (queue, id, code) => {
            id = treeId(id);
            if (visited.get(code).has(id)) return;
            if (!queue.has(id)) queue.set(id, new Set());
            queue.get(id).add(code);
        };
        for (const code of codes) {
            const course = identities.courses.get(code);
            if (
                !course ||
                identities.errors.has(code) ||
                course.deletingOperation ||
                course.changingOperation
            )
                continue;
            if (Array.isArray(course.children))
                for (const id of course.children) enqueue(pending, id, code);
        }
        for (let depth = 1; pending.size; depth++) {
            // Let the existing full validator handle oversized or malformed trees.
            if (depth > treeLimits.depth || pending.size > treeLimits.nodes * codes.size)
                return false;
            const missing = objectIds([...pending.keys()].filter((id) => !folders.has(id)));
            if (missing.length)
                for (const folder of await FolderModel.find({ _id: { $in: missing } })
                    .select(folderFields)
                    .lean())
                    folders.set(treeId(folder), folder);
            const next = new Map();
            for (const [id, owners] of pending) {
                const folder = folders.get(id);
                if (!folder || !Array.isArray(folder.courses) || folder.deletingOperation) continue;
                const membership = treeCodes(folder.courses);
                for (const code of owners) {
                    if (visited.get(code).has(id) || !membership.includes(code)) continue;
                    visited.get(code).add(id);
                    if (visited.get(code).size > treeLimits.nodes) return false;
                    if (!Array.isArray(folder.children)) continue;
                    if (folder.childType === "Folder")
                        for (const child of folder.children) enqueue(next, child, code);
                    else if (folder.childType === "File")
                        for (const child of folder.children) {
                            fileIds.add(treeId(child));
                            if (fileIds.size > treeLimits.nodes * selected.size) return false;
                        }
                }
            }
            pending = next;
        }
        const missingFiles = objectIds([...fileIds].filter((id) => !files.has(id)));
        if (missingFiles.length)
            for (const file of await FileModel.find({ _id: { $in: missingFiles } })
                .select("_id")
                .lean())
                files.set(treeId(file), file);
        return true;
    };
    const build = () =>
        buildLibraryGraph(courses, [...folders.values()], [...files.values()], {
            courseCodes: selected,
        });
    if (!(await loadTrees(selected))) return loadLibraryGraph();
    if ((fileId || requestedFileIds) && !courseCode && !courseCodes.length && !folderId)
        return build();

    const initial = build();
    const loaded = new Set(selected);
    for (const id of initial.folderCourses.keys()) addCodes(folders.get(id).courses);
    if (initial.fileCourses.size)
        for (const parent of await fileParents(initial.fileCourses.keys()))
            addCodes(parent.courses);
    const related = new Set([...selected].filter((code) => !loaded.has(code)));
    if (related.size && !(await loadTrees(related))) return loadLibraryGraph();
    return build();
}
