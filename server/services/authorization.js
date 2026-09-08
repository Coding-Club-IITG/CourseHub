import Course, { FolderModel, FileModel } from "../modules/course/course.model.js";
import CourseAllotment from "../modules/course/courseAllotment.model.js";
import BR from "../modules/br/br.model.js";
import Contribution from "../modules/contribution/contribution.model.js";
import AppError from "../utils/appError.js";
import { normalizeCourseCode } from "../utils/course.js";

const idOf = (value) => String(value?._id || value);
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

// Evaluate the existing academic cutoff on each request, including after semester rollover
export function academicPeriod(now = new Date()) {
    const parts = Object.fromEntries(
        new Intl.DateTimeFormat("en-US", {
            timeZone: "Asia/Kolkata",
            year: "numeric",
            month: "numeric",
            day: "numeric",
        })
            .formatToParts(now)
            .map(({ type, value }) => [type, Number(value)]),
    );
    return {
        year: parts.year,
        session: parts.month < 7 || (parts.month === 7 && parts.day <= 23) ? "Jan-May" : "July-Nov",
    };
}

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
    const code = courseContext(value);
    const actor = await actorFor(req);
    const permitted = capabilities(actor, code);
    if (action !== "read" && !permitted[action])
        throw new AppError(403, "You do not have permission for this course");
    const graph = await libraryGraph(req);
    const course = graph.courses.get(code);
    if (!course) throw new AppError(404, "Course not found");
    return { course, code, actor, capabilities: permitted };
}

// Membership requires a path from a real course root through folders still linked to that course
export async function libraryGraph(req) {
    if (!req.authorizationGraph)
        req.authorizationGraph = (async () => {
            const [courses, folders] = await Promise.all([
                Course.find().select("_id code name children books createdAt updatedAt").lean(),
                FolderModel.find().select("_id name courses childType children").lean(),
            ]);
            const graph = {
                courses: new Map(courses.map((c) => [normalizeCourseCode(c.code), c])),
                folders: new Map(folders.map((f) => [idOf(f), f])),
                folderCourses: new Map(),
                fileCourses: new Map(),
            };
            const add = (map, id, code) => {
                if (!map.has(id)) map.set(id, new Set());
                map.get(id).add(code);
            };
            for (const [code, course] of graph.courses) {
                const visited = new Set();
                const walk = (id, ancestors = new Set()) => {
                    id = idOf(id);
                    if (ancestors.has(id) || ancestors.size > 64)
                        throw new AppError(409, "Course tree requires repair");
                    if (visited.has(id)) return;
                    const folder = graph.folders.get(id);
                    if (!folder || !codesOf(folder.courses).includes(code)) return;
                    visited.add(id);
                    add(graph.folderCourses, id, code);
                    if (folder.childType === "File")
                        for (const file of folder.children)
                            add(graph.fileCourses, idOf(file), code);
                    else
                        for (const child of folder.children)
                            walk(child, new Set([...ancestors, id]));
                };
                for (const root of course.children) walk(root);
            }
            return graph;
        })();
    return req.authorizationGraph;
}

export async function requireFolder(req, id, value, action = "read") {
    id = resourceId(id);
    const graph = await libraryGraph(req);
    const affectedCourses = [...(graph.folderCourses.get(id) || [])].sort();
    const code = value
        ? courseContext(value)
        : action === "read"
          ? affectedCourses[0]
          : courseContext(value);
    if (!code || !affectedCourses.includes(code)) throw new AppError(404, "Folder not found");
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
    if (!file || !affectedCourses.length) throw new AppError(404, "File not found");
    const code = value
        ? courseContext(value)
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

export async function presentFolder(req, id, code) {
    const [graph, files, actor] = await Promise.all([
        libraryGraph(req),
        visibleFileMap(req),
        actorFor(req),
    ]);
    const folder = graph.folders.get(idOf(id));
    if (!folder || !graph.folderCourses.get(idOf(id))?.has(code)) return null;
    const children = (
        await Promise.all(
            folder.children.map(async (child) =>
                folder.childType === "Folder"
                    ? presentFolder(req, child, code)
                    : files.has(idOf(child))
                      ? presentFile(req, files.get(idOf(child)), code)
                      : null,
            ),
        )
    ).filter(Boolean);
    return {
        ...folder,
        children,
        totalFileCount:
            folder.childType === "File"
                ? children.length
                : children.reduce((sum, child) => sum + child.totalFileCount, 0),
        capabilities: capabilities(actor, code),
        affectedCourses: [...graph.folderCourses.get(idOf(id))].sort(),
    };
}

export async function presentCourse(req, value) {
    const { course, code, capabilities: permitted } = await requireCourse(req, value);
    const children = (
        await Promise.all(course.children.map((id) => presentFolder(req, id, code)))
    ).filter(Boolean);
    children.sort((a, b) => a.name.localeCompare(b.name));
    return { ...course, children, capabilities: permitted };
}

export async function visibleFiles(req) {
    return Promise.all(
        [...(await visibleFileMap(req)).values()].map((file) => presentFile(req, file)),
    );
}

export async function authorizeContributionUpload(req, res, next) {
    try {
        const id = req.headers["contribution-id"];
        if (typeof id !== "string" || !id || id.length > 100)
            throw new AppError(404, "Contribution not found");
        const contribution = await Contribution.findOne({
            contributionId: id,
            uploadedBy: (await actorFor(req)).id,
        });
        if (!contribution) throw new AppError(404, "Contribution not found");
        const context = await requireFolder(
            req,
            idOf(contribution.parentFolder),
            contribution.courseCode,
            "canContribute",
        );
        if (context.folder.childType !== "File") throw new AppError(400, "Choose a file folder");
        req.contribution = contribution;
        req.contributionApproved = context.capabilities.canManage;
        next();
    } catch (error) {
        next(error);
    }
}
