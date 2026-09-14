import { createUpload } from "../../services/uploads.js";
import { presentOperation } from "../operation/operation.controller.js";
import Contribution from "./contribution.model.js";
import { FileModel } from "../course/course.model.js";
import AppError from "../../utils/appError.js";
import {
    actorFor,
    requireFolder,
    requireFile,
    presentFile,
    libraryGraph,
    resourceReadRequest,
    fileReadRequest,
} from "../../services/authorization.js";
import { normalizeCourseCode } from "../../utils/course.js";
import { treeId } from "../../services/folderTrees.js";

async function CreateNewContribution(req, res) {
    const operation = await createUpload(req);
    res.status(201).json(presentOperation(operation, await actorFor(req)));
}

export async function presentContribution(
    req,
    contribution,
    contextCode = contribution.courseCode,
) {
    const files = [];
    for (const file of contribution.files) {
        try {
            const context = await requireFile(req, treeId(file), contextCode);
            files.push(await presentFile(req, context.file, contextCode));
        } catch (error) {
            if (error.status !== 404) throw error;
        }
    }
    return {
        ...contribution.toObject(),
        files,
        approved: files.length > 0 && files.every((file) => file.isVerified),
        managementCourseCode: contextCode,
    };
}

async function GetMyContributions(req, res) {
    const contributions = await Contribution.find({ uploadedBy: String(req.user._id) });
    if (!contributions.length) return res.json([]);
    const fileIds = contributions.flatMap((c) => c.files.map(treeId));
    if (fileIds.length) req = resourceReadRequest(req, { fileIds });
    res.json(await Promise.all(contributions.map((c) => presentContribution(req, c))));
}

async function GetBrContribution(req, res) {
    const actor = await actorFor(req);
    // Course filters are optional narrowing only. They cannot expand a BR's scope.
    const requested = req.body.courses;
    if (requested !== undefined && !Array.isArray(requested))
        throw new AppError(400, "Invalid course filter");
    const courses = requested?.map((c) =>
        typeof c?.code === "string" ? normalizeCourseCode(c.code) : "",
    );
    if (courses?.some((code) => !code || (!actor.admin && !actor.managed.includes(code))))
        throw new AppError(403, "You do not have permission for this course");
    if (courses?.length === 0 || (!actor.admin && !actor.managed.length))
        return res.json({ unverifiedContributions: [] });
    if (courses || !actor.admin)
        req = resourceReadRequest(req, { courseCodes: courses || actor.managed });
    const graph = await libraryGraph(req);
    const allowed = new Set(courses || (actor.admin ? [...graph.courses.keys()] : actor.managed));
    const folders = new Map(
        [...graph.folderCourses]
            .map(([id, codes]) => [id, [...codes].filter((code) => allowed.has(code))])
            .filter(([, codes]) => codes.length),
    );
    const pendingFiles = await FileModel.find({
        _id: {
            $in: [...graph.fileCourses]
                .filter(([, codes]) => [...codes].some((code) => allowed.has(code)))
                .map(([id]) => id),
        },
        isVerified: { $ne: true },
    })
        .select("_id")
        .lean();
    if (!pendingFiles.length) return res.json({ unverifiedContributions: [] });
    const contributions = await Contribution.find({
        parentFolder: { $in: [...folders.keys()] },
        files: { $in: pendingFiles.map((file) => file._id) },
    });
    req = fileReadRequest(
        req,
        contributions.flatMap((c) => c.files.map(treeId)),
    );
    const visible = [];
    for (const contribution of contributions) {
        try {
            const contexts = folders.get(String(contribution.parentFolder));
            const submittedCode = normalizeCourseCode(contribution.courseCode);
            const contextCode = contexts.includes(submittedCode) ? submittedCode : contexts[0];
            await requireFolder(req, String(contribution.parentFolder), contextCode, "canModerate");
            const data = await presentContribution(req, contribution, contextCode);
            if (data.files.some((file) => !file.isVerified)) visible.push(data);
        } catch (error) {
            if (error.status !== 404) throw error;
        }
    }
    res.json({ unverifiedContributions: visible });
}
export default { CreateNewContribution, GetMyContributions, GetBrContribution };
