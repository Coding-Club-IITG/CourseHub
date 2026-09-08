import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import Contribution from "./contribution.model.js";
import { FolderModel, FileModel } from "../course/course.model.js";
import UploadFile from "../../services/UploadFile.js";
import AppError from "../../utils/appError.js";
import {
    actorFor,
    requireFolder,
    requireFile,
    presentFile,
    libraryGraph,
} from "../../services/authorization.js";
import { normalizeCourseCode } from "../../utils/course.js";
import logger from "../../utils/logger.js";

async function CreateNewContribution(req, res) {
    const allowed = ["parentFolder", "courseCode", "description"];
    if (Object.keys(req.body).some((key) => !allowed.includes(key)))
        throw new AppError(400, "Unexpected contribution fields");
    const { parentFolder, courseCode, description = "" } = req.body;
    if (typeof description !== "string" || description.length > 2000)
        throw new AppError(400, "Invalid description");
    const context = await requireFolder(req, parentFolder, courseCode, "canContribute");
    if (context.folder.childType !== "File") throw new AppError(400, "Choose a file folder");
    const contribution = await Contribution.create({
        contributionId: randomUUID(),
        uploadedBy: context.actor.id,
        parentFolder,
        courseCode: context.code,
        description,
        approved: context.capabilities.canManage,
    });
    logger.metric?.("contribution_created", {
        value: 1,
        dimensions: {
            courseCode: context.code,
            userId: context.actor.id,
            department: req.user?.department || "administration",
            semester: req.user?.semester || 0,
        },
    });
    res.json({ created: true, data: contribution });
}

async function HandleFileUpload(req, res) {
    const files = req.files || [];
    if (!files.length) throw new AppError(400, "No files were uploaded");
    const uploaded = [];
    const actor = await actorFor(req);
    try {
        for (const file of files) {
            const name = file.originalname;
            if (!name || /[\\/\x00-\x1f]/.test(name)) throw new AppError(400, "Invalid filename");
            const dot = name.lastIndexOf(".");
            const base = dot === -1 ? name : name.slice(0, dot);
            const extension = dot === -1 ? "" : name.slice(dot);
            const contributor = (req.admin?.userId || req.user.name)
                .replace(/[\\/:*?"<>|~\x00-\x1f]/g, "")
                .slice(0, 80);
            const fileId = await UploadFile(
                file.path,
                base + "~" + contributor + extension,
                req.contributionApproved,
            );
            if (!fileId) throw new AppError(502, "File upload failed");
            await Contribution.updateOne(
                { _id: req.contribution._id, uploadedBy: actor.id },
                { $addToSet: { files: fileId }, $set: { approved: req.contributionApproved } },
            );
            await FolderModel.updateOne(
                { _id: req.contribution.parentFolder },
                { $addToSet: { children: fileId } },
            );
            uploaded.push(String(fileId));
        }
        res.send(uploaded[0]);
    } finally {
        await Promise.all(files.map((file) => fs.unlink(file.path).catch(() => {})));
    }
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
    return { ...contribution.toObject(), files, managementCourseCode: contextCode };
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
export default { CreateNewContribution, HandleFileUpload, GetMyContributions, GetBrContribution };
