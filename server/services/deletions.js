import { randomUUID } from "node:crypto";
import { OperationModel } from "../modules/operation/operation.model.js";
import Course, { FolderModel, FileModel } from "../modules/course/course.model.js";
import Contribution from "../modules/contribution/contribution.model.js";
import User from "../modules/user/user.model.js";
import Admin from "../modules/admin/admin.model.js";
import {
    actorFor,
    requireCourse,
    requireFile,
    requireFolder,
    libraryGraph,
    courseContext,
} from "./authorization.js";
import { journalStep, completeOperation } from "./operationJournal.js";
import { walkFolderTree } from "./folderTrees.js";
import { relatedCourses } from "./contentMutation.js";
import { acquireCourseLocks, releaseCourseLocks } from "./courseLocks.js";
import { storage, storageId } from "./storage.js";
import { storageRoot } from "../config/storage.js";
import { deleteThumbnail } from "./imagekit.js";
import { invalidateThumbnail } from "./thumbnails.js";
import { removeCourseReferences, assertCourseReferenceShapes } from "./courseReferences.js";
import { identityLock } from "./courseIdentity.js";
import { normalizeCourseCode } from "../utils/course.js";
import AppError from "../utils/appError.js";

export async function operationActor(operation) {
    const actor =
        operation.actorRole === "admin"
            ? await Admin.findById(operation.actorId)
            : await User.findById(operation.actorId);
    if (!actor) throw new AppError(403, "The account is no longer available");
    return {
        [operation.actorRole === "admin" ? "admin" : "user"]: actor,
        operationId: operation._id,
    };
}

async function authorizeTarget(req, target) {
    if (target.kind === "file") return requireFile(req, target.id, target.code, "canManage");
    if (target.kind === "folder") {
        const context = await requireFolder(req, target.id, target.code, "canManage");
        if (target.rootOnly && !context.course.children.some((id) => String(id) === target.id))
            throw new AppError(404, "Year not found");
        return context;
    }
    if (target.kind === "course") {
        if (!(await actorFor(req)).admin)
            throw new AppError(403, "Administrator access is required");
        return requireCourse(req, target.code, "canManage");
    }
    if (target.kind === "contribution") {
        const contribution = await Contribution.findOne({ contributionId: target.id });
        if (!contribution) throw new AppError(404, "Contribution not found");
        const context = await requireFolder(
            req,
            String(contribution.parentFolder),
            target.code,
            "canModerate",
        );
        const affected = new Set([context.code]);
        for (const id of contribution.files) {
            const file = await requireFile(req, String(id), target.code, "canModerate");
            file.affectedCourses.forEach((code) => affected.add(code));
        }
        return { ...context, contribution, affectedCourses: [...affected].sort() };
    }
    throw new AppError(400, "Invalid deletion target");
}

async function deletionPlan(req, target) {
    const context = await authorizeTarget(req, target);
    if (target.kind === "course")
        for (const code of [context.code, ...(context.course.aliases || [])])
            await assertCourseReferenceShapes(code);
    const graph = await libraryGraph(req);
    const fileIds = new Set();
    const folderIds = new Set();
    const foldersToDelete = [];
    const foldersToUnlink = [];
    const contributionIds = [];
    const collect = (roots) => {
        const tree = walkFolderTree(graph, roots, context.code, { operationId: req.operationId });
        for (const id of tree.folders) folderIds.add(id);
    };
    if (target.kind === "file") fileIds.add(String(context.file._id));
    if (target.kind === "contribution") {
        context.contribution.files.forEach((id) => fileIds.add(String(id)));
        contributionIds.push(String(context.contribution._id));
    }
    if (target.kind === "folder") collect([target.id]);
    if (target.kind === "course") collect(context.course.children);
    for (const id of folderIds) {
        const folder = graph.folders.get(id);
        const remaining = folder.courses.filter(
            (code) => normalizeCourseCode(code) !== context.code,
        );
        if (remaining.length || graph.folderCourses.get(id).size > 1)
            foldersToUnlink.push({ id, remaining });
        else foldersToDelete.push(id);
    }
    const removedFolders = new Set(foldersToDelete);
    for (const id of foldersToDelete) {
        const folder = graph.folders.get(id);
        if (folder.childType === "File")
            folder.children.forEach((child) => fileIds.add(String(child)));
    }
    if (["folder", "course"].includes(target.kind)) {
        for (const [id, folder] of graph.folders) {
            if (!removedFolders.has(id) && folder.childType === "File")
                folder.children.forEach((child) => fileIds.delete(String(child)));
        }
    }
    const files = await FileModel.find({ _id: { $in: [...fileIds] } }).lean();
    const unfinishedUploads = await OperationModel.find({
        kind: "upload",
        status: { $nin: ["completed", "cancelled"] },
        $or: [
            { "target.contributionId": { $in: contributionIds } },
            { "target.folderId": { $in: foldersToDelete } },
            {
                "target.folderId": { $in: foldersToUnlink.map((folder) => folder.id) },
                "target.code": context.code,
            },
        ],
    })
        .select("_id")
        .lean();
    const affectedCourses = new Set([context.code]);
    for (const file of files) {
        storageId(file.fileId);
        if (file.fileId === storageRoot())
            throw new AppError(403, "The storage root is protected", "STORAGE_ROOT_PROTECTED");
        for (const code of graph.fileCourses.get(String(file._id)) || []) affectedCourses.add(code);
    }
    const plan = {
        courseId: String(context.course?._id || graph.courses.get(context.code)._id),
        code: context.code,
        name: context.file?.name || context.folder?.name || context.course?.name || "Contribution",
        files: files.map((file) => ({
            id: String(file._id),
            providerId: file.fileId,
            thumbnailId: file.thumbnail?.fileId,
        })),
        foldersToDelete,
        foldersToUnlink,
        contributionIds,
        uploadOperationIds: unfinishedUploads.map((operation) => operation._id),
        rootIds:
            target.kind === "course"
                ? context.course.children.map(String)
                : target.kind === "folder"
                  ? [target.id]
                  : [],
        deleteCourse: target.kind === "course",
        identityCodes: [context.code, ...(context.course?.aliases || [])],
        affectedCourses: [...affectedCourses].sort(),
    };
    if (JSON.stringify(plan).length > 8 * 1024 * 1024)
        throw new AppError(
            409,
            "This deletion requires a smaller selection",
            "OPERATION_TOO_LARGE",
        );
    return plan;
}

export async function scheduleDeletion(req, target) {
    const actor = await actorFor(req);
    const graph = await libraryGraph(req);
    target = {
        ...target,
        code: graph.aliases?.get(courseContext(target.code)) || courseContext(target.code),
    };
    if (
        target.kind !== "course" &&
        (typeof target.id !== "string" ||
            !target.id ||
            target.id.length > 100 ||
            (["file", "folder"].includes(target.kind) && !/^[a-f0-9]{24}$/i.test(target.id)))
    )
        throw new AppError(404, "Resource not found");
    if (target.kind === "course") {
        const course = await Course.findOne({ code: target.code }).select("_id").lean();
        if (course) target.id = String(course._id);
        else {
            const previous = await OperationModel.findOne({
                kind: "delete",
                actorId: actor.id,
                "target.kind": "course",
                "target.code": target.code,
                status: "completed",
            }).sort({ createdAt: -1 });
            if (previous) return accepted(previous);
        }
    }
    if (target.id) {
        const existing = await OperationModel.findOne({
            kind: "delete",
            actorId: actor.id,
            "target.kind": target.kind,
            "target.id": target.id,
            "target.code": normalizeCourseCode(target.code),
            $or: [{ status: { $ne: "failed" } }, { plan: { $exists: true } }],
        }).sort({ createdAt: -1 });
        if (existing) return accepted(existing);
    }
    const context = await authorizeTarget(req, target);
    if (["file", "contribution"].includes(target.kind) && context.affectedCourses.length > 1) {
        if (
            !Array.isArray(req.body.affectedCourses) ||
            JSON.stringify([...new Set(req.body.affectedCourses)].sort()) !==
                JSON.stringify(context.affectedCourses)
        )
            throw new AppError(
                409,
                "Review every affected course before deleting shared files",
                "SHARED_CONFIRMATION_REQUIRED",
            );
    }
    let operation;
    try {
        operation = await OperationModel.create({
            _id: randomUUID(),
            kind: "delete",
            actorId: actor.id,
            actorRole: actor.admin ? "admin" : "student",
            requestKey: `delete:${target.kind}:${target.id}:${target.code}`,
            target: { ...target, code: context.code, confirmedCourses: context.affectedCourses },
            courses: [
                ...new Set([
                    ...(target.kind === "course" ? [identityLock] : []),
                    ...(await relatedCourses(req, [context.code])),
                ]),
            ].sort(),
            status: "planning",
        });
    } catch (error) {
        if (error.code !== 11000) throw error;
        return accepted(
            await OperationModel.findOne({
                actorId: actor.id,
                requestKey: `delete:${target.kind}:${target.id}:${target.code}`,
            }),
        );
    }
    try {
        await prepareDeletion(operation, req);
    } catch (error) {
        if (error.code === "COURSE_BUSY") {
            await OperationModel.updateOne(
                { _id: operation._id },
                { $set: { nextRunAt: new Date(Date.now() + 1000) } },
            );
        } else {
            await OperationModel.updateOne(
                { _id: operation._id },
                {
                    $set: {
                        status: "failed",
                        error: {
                            code: error.code || "DELETE_FAILED",
                            message: "Deletion could not be prepared",
                        },
                    },
                },
            );
            if (!(await OperationModel.findById(operation._id)).plan) {
                await releaseCourseLocks(operation._id);
                await OperationModel.updateOne(
                    { _id: operation._id },
                    { $unset: { requestKey: 1 } },
                );
            }
            throw error;
        }
    }
    return {
        operationId: operation._id,
        status: "queued",
        statusUrl: `/api/operations/${operation._id}`,
    };
}

function accepted(operation) {
    return {
        operationId: operation._id,
        status: operation.status,
        statusUrl: `/api/operations/${operation._id}`,
    };
}

export async function prepareDeletion(operation, req) {
    await acquireCourseLocks(operation.courses, operation._id, { durable: true });
    let plan = operation.plan;
    if (!plan) {
        req ||= await operationActor(operation);
        req.operationId = operation._id;
        req.authorizationGraph = undefined;
        const currentCodes = await relatedCourses(req, [operation.target.code]);
        if (currentCodes.some((code) => !operation.courses.includes(code)))
            throw new AppError(
                409,
                "Course sharing changed; review the deletion again",
                "SHARING_CHANGED",
            );
        plan = await deletionPlan(req, operation.target);
        if (
            ["file", "contribution"].includes(operation.target.kind) &&
            JSON.stringify(plan.affectedCourses) !==
                JSON.stringify(operation.target.confirmedCourses)
        )
            throw new AppError(
                409,
                "Course sharing changed; review the deletion again",
                "SHARING_CHANGED",
            );
        await OperationModel.updateOne({ _id: operation._id }, { $set: { plan } });
    }
    if (plan.uploadOperationIds?.length)
        await OperationModel.updateMany(
            {
                _id: { $in: plan.uploadOperationIds },
                kind: "upload",
                status: { $nin: ["completed", "cancelled"] },
            },
            {
                $set: {
                    cancelRequested: true,
                    status: "cancelling",
                    nextRunAt: new Date(),
                    attempts: 0,
                },
                $inc: { revision: 1 },
            },
        );
    await FileModel.updateMany(
        { _id: { $in: plan.files.map((file) => file.id) } },
        { $set: { deletingOperation: operation._id } },
    );
    await FolderModel.updateMany(
        { _id: { $in: plan.foldersToDelete } },
        { $set: { deletingOperation: operation._id } },
    );
    await Contribution.updateMany(
        { _id: { $in: plan.contributionIds } },
        { $set: { deletingOperation: operation._id } },
    );
    if (plan.deleteCourse)
        await Course.updateOne(
            { _id: plan.courseId },
            { $set: { deletingOperation: operation._id } },
        );
    await OperationModel.updateOne({ _id: operation._id }, { $set: { status: "queued" } });
    return plan;
}

export async function runDeletion(operation, checkpoint) {
    const plan = operation.plan || (await prepareDeletion(operation));
    await acquireCourseLocks(operation.courses, operation._id, { durable: true });
    const step = journalStep(operation, checkpoint);
    // Marks are replayed even if the process stopped between journaling and marking.
    await step("mark", () => prepareDeletion({ ...(operation.toObject?.() || operation), plan }));
    for (const file of plan.files) {
        await step(`storage:${file.id}`, () => storage.remove(file.providerId));
        if (file.thumbnailId)
            await step(`thumbnail:${file.id}`, async () => {
                try {
                    await deleteThumbnail(file.thumbnailId);
                } catch (error) {
                    if (![error.status, error.statusCode].includes(404)) throw error;
                }
            });
        await step(`metadata:${file.id}`, async () => {
            await FolderModel.updateMany({ children: file.id }, { $pull: { children: file.id } });
            await Contribution.updateMany({ files: file.id }, { $pull: { files: file.id } });
            await FileModel.deleteOne({ _id: file.id, deletingOperation: operation._id });
            invalidateThumbnail(file.providerId);
        });
    }
    await step("folders", async () => {
        for (const folder of plan.foldersToUnlink)
            await FolderModel.updateOne(
                { _id: folder.id },
                { $set: { courses: folder.remaining } },
            );
        await Course.updateOne(
            { _id: plan.courseId },
            { $pull: { children: { $in: plan.rootIds } } },
        );
        await FolderModel.updateMany(
            { children: { $in: plan.foldersToDelete } },
            { $pull: { children: { $in: plan.foldersToDelete } } },
        );
        await FolderModel.deleteMany({
            _id: { $in: plan.foldersToDelete },
            deletingOperation: operation._id,
        });
        await Contribution.deleteMany({
            $or: [
                { _id: { $in: plan.contributionIds } },
                { parentFolder: { $in: plan.foldersToDelete } },
            ],
        });
    });
    if (plan.deleteCourse)
        await step("course", async () => {
            await removeCourseReferences(plan);
            await Course.deleteOne({ _id: plan.courseId, deletingOperation: operation._id });
        });
    await completeOperation(operation, checkpoint);
}
