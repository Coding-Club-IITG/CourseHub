import { withRevision } from "../utils/resourceRevision.js";
import { FileModel } from "../modules/course/course.model.js";
import CourseAllotment from "../modules/course/courseAllotment.model.js";
import BR from "../modules/br/br.model.js";
import Contribution from "../modules/contribution/contribution.model.js";
import AppError from "../utils/appError.js";
import { normalizeCourseCode } from "../utils/course.js";

import {
    loadLibraryGraph,
    assertValidCourseTree,
    walkFolderTree,
    treeId as idOf,
} from "./folderTrees.js";
const codesOf = (values = []) => [...new Set(values.map(normalizeCourseCode).filter(Boolean))];
export function resourceId(value) {
    if (typeof value !== "string" || !/^[a-f0-9]{24}$/i.test(value))
        throw new AppError(404, "Resource not found");
    return value.toLowerCase();
}

export function courseContext(value) {
    if (typeof value !== "string" || !normalizeCourseCode(value))
        throw new AppError(400, "Course context is required");
    return normalizeCourseCode(value);
}

import { academicPeriod } from "./academicPeriod.js";
export { academicPeriod } from "./academicPeriod.js";

export async function actorFor(req) {
    if (!req.authorizationActor)
        req.authorizationActor = (async () => {
            if (req.admin)
                return { admin: true, id: idOf(req.admin), isBR: false, current: [], managed: [] };
            if (!req.user) throw new AppError(401, "Sign in to continue");
            const email = req.user.email?.trim().toLowerCase();
            const [br, allotments] = await Promise.all([
                email
                    ? BR.findOne({ email }).collation({ locale: "en", strength: 2 }).lean()
                    : null,
                CourseAllotment.find({ rollNumber: req.user.rollNumber }).lean(),
            ]);
            const period = academicPeriod();
            const pastOrCurrent = allotments.filter(
                (a) =>
                    ["Jan-May", "July-Nov"].includes(a.session) &&
                    (a.year < period.year ||
                        (a.year === period.year &&
                            (a.session === "Jan-May" || period.session === "July-Nov"))),
            );
            return {
                admin: false,
                id: idOf(req.user),
                isBR: Boolean(br),
                current: codesOf(
                    pastOrCurrent
                        .filter((a) => a.year === period.year && a.session === period.session)
                        .flatMap((a) => a.courses),
                ),
                managed: br ? codesOf(pastOrCurrent.flatMap((a) => a.courses)) : [],
            };
        })();
    return req.authorizationActor;
}

export function capabilities(actor, code) {
    const canManage = actor.admin || actor.managed.includes(normalizeCourseCode(code));
    return {
        canManage,
        canModerate: canManage,
        canContribute: canManage || actor.current.includes(normalizeCourseCode(code)),
    };
}

export async function requireCourse(req, value, action = "read") {
    const graph = await libraryGraph(req);
    const code = graph.aliases?.get(courseContext(value)) || courseContext(value);
    const actor = await actorFor(req);
    const permitted = capabilities(actor, code);
    if (action !== "read" && !permitted[action])
        throw new AppError(403, "You do not have permission for this course");
    assertValidCourseTree(graph, code);
    const course = graph.courses.get(code);
    if (
        !course ||
        (course.deletingOperation && course.deletingOperation !== req.operationId) ||
        (course.changingOperation && course.changingOperation !== req.operationId)
    )
        throw new AppError(404, "Course not found");
    return { course, code, actor, capabilities: permitted };
}

export async function libraryGraph(req) {
    req.authorizationGraph ||= loadLibraryGraph({ operationId: req.operationId });
    return req.authorizationGraph;
}

export async function requireFolder(req, id, value, action = "read") {
    id = resourceId(id);
    const graph = await libraryGraph(req);
    if (!graph.folders.has(id)) throw new AppError(404, "Folder not found");
    if (value) assertValidCourseTree(graph, courseContext(value));
    const affectedCourses = [...(graph.folderCourses.get(id) || [])].sort();
    const code = value
        ? graph.aliases?.get(courseContext(value)) || courseContext(value)
        : action === "read"
          ? affectedCourses[0]
          : courseContext(value);
    if (
        !code ||
        !affectedCourses.includes(code) ||
        (graph.folders.get(id)?.deletingOperation &&
            graph.folders.get(id).deletingOperation !== req.operationId)
    )
        throw new AppError(404, "Folder not found");
    const course = await requireCourse(req, code, action);
    return { ...course, folder: graph.folders.get(id), affectedCourses };
}

async function ownedFiles(req) {
    if (!req.authorizationOwnedFiles)
        req.authorizationOwnedFiles = (async () => {
            const actor = await actorFor(req);
            if (!actor.id) return new Set();
            const contributions = await Contribution.find({ uploadedBy: actor.id })
                .select("files")
                .lean();
            return new Set(contributions.flatMap((c) => c.files.map(idOf)));
        })();
    return req.authorizationOwnedFiles;
}

export async function canReadFile(req, file) {
    if (file.deletingOperation || file.resourceState === "uploading") return false;
    const [actor, graph] = await Promise.all([actorFor(req), libraryGraph(req)]);
    const courses = [...(graph.fileCourses.get(idOf(file)) || [])];
    if (!courses.length) return false;
    return (
        file.isVerified === true ||
        actor.admin ||
        courses.some((c) => actor.managed.includes(c)) ||
        (await ownedFiles(req)).has(idOf(file))
    );
}

export async function requireFile(req, id, value, action = "read") {
    id = resourceId(id);
    const [file, graph, actor] = await Promise.all([
        FileModel.findById(id),
        libraryGraph(req),
        actorFor(req),
    ]);
    const affectedCourses = [...(graph.fileCourses.get(id) || [])].sort();
    if (
        !file ||
        !affectedCourses.length ||
        (file.deletingOperation && file.deletingOperation !== req.operationId) ||
        file.resourceState === "uploading"
    )
        throw new AppError(404, "File not found");
    const code = value
        ? graph.aliases?.get(courseContext(value)) || courseContext(value)
        : action === "read"
          ? undefined
          : courseContext(value);
    if (code && !affectedCourses.includes(code)) throw new AppError(404, "File not found");
    if (action !== "read") await requireCourse(req, code, action);
    else if (!(await canReadFile(req, file))) throw new AppError(404, "File not found");
    return { file, affectedCourses, code, actor };
}

export async function presentFile(req, file, code) {
    const [actor, graph] = await Promise.all([actorFor(req), libraryGraph(req)]);
    const id = idOf(file),
        affectedCourses = [...(graph.fileCourses.get(id) || [])].sort();
    return {
        _id: id,
        name: file.name,
        size: file.size,
        sizeBytes: file.sizeBytes,
        contributorName: file.contributorName,
        isVerified: file.isVerified === true,
        webUrl: `/api/files/preview/${id}`,
        downloadUrl: `/api/files/content/${id}?download=1`,
        thumbnail: { url: `/api/files/thumbnail/${id}` },
        affectedCourses,
        capabilities: capabilities(
            actor,
            code || affectedCourses.find((c) => capabilities(actor, c).canManage),
        ),
    };
}

async function visibleFileMap(req) {
    if (!req.authorizationVisibleFiles)
        req.authorizationVisibleFiles = (async () => {
            const graph = await libraryGraph(req);
            const files = await FileModel.find({
                _id: { $in: [...graph.fileCourses.keys()] },
            }).lean();
            const visible = await Promise.all(
                files.map(async (file) => ((await canReadFile(req, file)) ? file : null)),
            );
            return new Map(visible.filter(Boolean).map((file) => [idOf(file), file]));
        })();
    return req.authorizationVisibleFiles;
}

async function presentTree(req, roots, code) {
    const [graph, files, actor] = await Promise.all([
        libraryGraph(req),
        visibleFileMap(req),
        actorFor(req),
    ]);
    assertValidCourseTree(graph, code);
    const tree = walkFolderTree(graph, roots, code);
    const rendered = new Map(),
        presentedFiles = new Map();
    for (const id of tree.order) {
        const folder = graph.folders.get(id),
            children = [];
        for (const child of new Set(folder.children.map(idOf))) {
            if (folder.childType === "Folder") {
                if (rendered.has(child)) {
                    children.push(rendered.get(child));
                }
            } else if (files.has(child)) {
                if (!presentedFiles.has(child))
                    presentedFiles.set(child, await presentFile(req, files.get(child), code));
                children.push(presentedFiles.get(child));
            }
        }
        rendered.set(id, {
            ...folder,
            children,
            totalFileCount:
                folder.childType === "File"
                    ? children.length
                    : children.reduce((sum, child) => sum + child.totalFileCount, 0),
            capabilities: capabilities(actor, code),
            affectedCourses: [...graph.folderCourses.get(id)].sort(),
        });
    }
    return [...new Set(roots.map(idOf))].map((id) => rendered.get(id)).filter(Boolean);
}

export async function presentFolder(req, id, code) {
    const graph = await libraryGraph(req);
    if (!graph.folderCourses.get(idOf(id))?.has(code)) return null;
    return withRevision((await presentTree(req, [id], code))[0] || null);
}

export async function presentCourse(req, value) {
    const { course, code, capabilities: permitted } = await requireCourse(req, value);
    const children = await presentTree(req, course.children, code);
    children.sort((a, b) => a.name.localeCompare(b.name));
    return withRevision({ ...course, children, capabilities: permitted });
}

export async function visibleFiles(req) {
    return Promise.all(
        [...(await visibleFileMap(req)).values()].map((file) => presentFile(req, file)),
    );
}
