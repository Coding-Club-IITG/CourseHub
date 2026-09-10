import { createUpload } from "../../services/uploads.js";
import { presentOperation } from "../operation/operation.controller.js";
import Contribution from "./contribution.model.js";
import AppError from "../../utils/appError.js";
import {
    actorFor,
    requireFolder,
    requireFile,
    presentFile,
    libraryGraph,
} from "../../services/authorization.js";
import { normalizeCourseCode } from "../../utils/course.js";

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
            await requireFile(req, String(file._id), contextCode);
            files.push(await presentFile(req, file, contextCode));
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
    const contributions = await Contribution.find({ uploadedBy: String(req.user._id) }).populate(
        "files",
    );
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
    const graph = await libraryGraph(req);
    const allowed = new Set(courses || (actor.admin ? [...graph.courses.keys()] : actor.managed));
    const folders = new Map(
        [...graph.folderCourses]
            .map(([id, codes]) => [id, [...codes].filter((code) => allowed.has(code))])
            .filter(([, codes]) => codes.length),
    );
    const contributions = await Contribution.find({
        parentFolder: { $in: [...folders.keys()] },
    }).populate("files");
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
