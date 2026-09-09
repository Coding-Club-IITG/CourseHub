import fs from "node:fs/promises";
import { createReadStream, constants } from "node:fs";
import path from "node:path";
import { randomUUID, createHash } from "node:crypto";
import mongoose from "mongoose";
import { OperationModel, StorageLease } from "../modules/operation/operation.model.js";
import Contribution from "../modules/contribution/contribution.model.js";
import { FileModel, FolderModel } from "../modules/course/course.model.js";
import { uploadLimits, uploadDirectory } from "../config/storage.js";
import { actorFor, requireFolder } from "./authorization.js";
import { operationActor } from "./deletions.js";
import { relatedCourses } from "./contentMutation.js";
import { withCourseLocks, assertCourseWritable, releaseCourseLocks } from "./courseLocks.js";
import { acquireStorageLease, releaseStorageLease } from "./storageLeases.js";
import { storage } from "./storage.js";
import AppError from "../utils/appError.js";

export function validateManifest(manifest) {
    if (!Array.isArray(manifest) || !manifest.length)
        throw new AppError(400, "Choose at least one file", "INVALID_MANIFEST");
    if (manifest.length > uploadLimits.files)
        throw new AppError(413, "Choose no more than 40 files", "BATCH_TOO_LARGE");
    let total = 0;
    return manifest.map((entry) => {
        if (!entry || Object.keys(entry).some((key) => !["name", "size"].includes(key)))
            throw new AppError(400, "Invalid file manifest", "INVALID_MANIFEST");
        const { name, size } = entry;
        if (
            typeof name !== "string" ||
            !name.trim() ||
            Buffer.byteLength(name) > 240 ||
            /[\\/:*?"<>|\x00-\x1f\x7f]/.test(name) ||
            /[. ]$/.test(name) ||
            [".", ".."].includes(name) ||
            /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\.|$)/i.test(name)
        )
            throw new AppError(400, "A file has an unsupported name", "INVALID_FILENAME");
        if (!Number.isSafeInteger(size) || size < 1)
            throw new AppError(
                400,
                "Files must contain data and have a valid byte size",
                "INVALID_FILE_SIZE",
            );
        if (size > uploadLimits.fileBytes || (total += size) > uploadLimits.batchBytes)
            throw new AppError(
                413,
                "Uploads allow 100 MiB per file and 1 GiB per batch",
                "BATCH_TOO_LARGE",
            );
        const extension = path.extname(name);
        return {
            id: randomUUID(),
            name,
            size,
            fileId: new mongoose.Types.ObjectId(),
            state: "pending",
            remoteName: randomUUID() + (/^\.[a-zA-Z0-9]{1,15}$/.test(extension) ? extension : ""),
        };
    });
}

export function temporaryPath(name) {
    if (typeof name !== "string" || !/^[a-f0-9-]{36}\.upload$/.test(name))
        throw new AppError(400, "Invalid temporary upload identity");
    const file = path.resolve(uploadDirectory(), name);
    if (path.dirname(file) !== uploadDirectory())
        throw new AppError(400, "Invalid temporary upload path");
    return file;
}
export async function removeTemporary(name) {
    if (!name) return;
    await fs.unlink(temporaryPath(name)).catch((error) => {
        if (error.code !== "ENOENT") throw error;
    });
}

async function ensureContribution(operation) {
    await Contribution.updateOne(
        { _id: operation.target.contributionId },
        {
            $setOnInsert: {
                contributionId: operation._id,
                operationId: operation._id,
                uploadedBy: String(operation.actorId),
                parentFolder: operation.target.folderId,
                courseCode: operation.target.code,
                description: operation.target.description,
                approved: false,
                files: [],
            },
        },
        { upsert: true },
    );
}

export async function createUpload(req) {
    if (
        Object.keys(req.body || {}).some(
            (key) => !["parentFolder", "courseCode", "description", "manifest"].includes(key),
        )
    )
        throw new AppError(400, "Unexpected contribution fields");
    const entries = validateManifest(req.body.manifest);
    const description = req.body.description || "";
    if (typeof description !== "string" || description.length > 2000)
        throw new AppError(400, "Invalid description");
    const context = await requireFolder(
        req,
        req.body.parentFolder,
        req.body.courseCode,
        "canContribute",
    );
    if (context.folder.childType !== "File") throw new AppError(400, "Choose a file folder");
    await assertCourseWritable(context.code);
    const actor = await actorFor(req);
    const key = req.headers["idempotency-key"];
    if (typeof key !== "string" || !/^[a-zA-Z0-9-]{16,100}$/.test(key))
        throw new AppError(400, "An upload request identity is required", "INVALID_REQUEST_KEY");
    let operation = await OperationModel.findOne({ actorId: actor.id, requestKey: key });
    if (!operation) {
        try {
            operation = await OperationModel.create({
                _id: randomUUID(),
                kind: "upload",
                actorId: actor.id,
                actorRole: actor.admin ? "admin" : "student",
                requestKey: key,
                status: "awaiting",
                entries,
                courses: await relatedCourses(req, [context.code]),
                target: {
                    folderId: String(context.folder._id),
                    code: context.code,
                    description,
                    contributionId: new mongoose.Types.ObjectId().toString(),
                    contributorName: req.admin?.userId || req.user.name,
                },
            });
        } catch (error) {
            if (error.code !== 11000) throw error;
            operation = await OperationModel.findOne({ actorId: actor.id, requestKey: key });
        }
    }
    if (
        operation.kind !== "upload" ||
        operation.target.folderId !== String(context.folder._id) ||
        operation.target.code !== context.code ||
        JSON.stringify(operation.entries.map(({ name, size }) => ({ name, size }))) !==
            JSON.stringify(entries.map(({ name, size }) => ({ name, size })))
    )
        throw new AppError(
            409,
            "This upload identity already belongs to a different batch",
            "UPLOAD_CONFLICT",
        );
    await ensureContribution(operation);
    return operation;
}

export async function ownUpload(req, id) {
    if (typeof id !== "string" || id.length > 100)
        throw new AppError(404, "Contribution not found");
    const operation = await OperationModel.findOne({
        _id: id,
        kind: "upload",
        actorId: (await actorFor(req)).id,
    });
    if (!operation) throw new AppError(404, "Contribution not found");
    const context = await requireFolder(
        req,
        operation.target.folderId,
        operation.target.code,
        "canContribute",
    );
    if (context.folder.childType !== "File") throw new AppError(400, "Choose a file folder");
    await assertCourseWritable(context.code);
    return operation;
}

export async function reserveUpload(req) {
    const operation = await ownUpload(req, req.headers["contribution-id"]);
    const id = req.headers["upload-file-id"];
    const index = operation.entries.findIndex((entry) => entry.id === id);
    if (index < 0) throw new AppError(404, "Upload file not found");
    if (operation.cancelRequested)
        throw new AppError(409, "This upload was cancelled", "UPLOAD_CANCELLED");
    const entry = operation.entries[index];
    if (["queued", "uploading", "publishing", "completed"].includes(entry.state))
        return { operation, entry, existing: true };
    const token = randomUUID();
    const temporaryName = randomUUID() + ".upload";
    await acquireStorageLease("receive", token, 8, null);
    let saved;
    try {
        saved = await OperationModel.updateOne(
            {
                _id: operation._id,
                cancelRequested: false,
                receivingCount: { $lt: uploadLimits.concurrentFiles },
                entries: { $elemMatch: { id, state: { $in: ["pending", "failed"] } } },
            },
            {
                $set: {
                    [`entries.${index}.state`]: "receiving",
                    [`entries.${index}.receiveToken`]: token,
                    [`entries.${index}.temporaryName`]: temporaryName,
                    [`entries.${index}.receiveUntil`]: new Date(Date.now() + 15 * 60000),
                },
                $inc: { receivingCount: 1, revision: 1 },
            },
        );
    } catch (error) {
        await releaseStorageLease(token);
        throw error;
    }
    if (!saved.modifiedCount) {
        await releaseStorageLease(token);
        throw new AppError(
            409,
            "Two files are already being received; retry shortly",
            "UPLOAD_BUSY",
        );
    }
    if (!(await StorageLease.exists({ owner: token }))) {
        await receiveFailed({ operation, entry, index, token, temporaryName });
        throw new AppError(409, "Upload reservation expired; retry this file", "UPLOAD_BUSY");
    }
    return { operation, entry, index, token, temporaryName };
}

export async function receiveFailed(reservation, error) {
    const { operation, entry, index, token, temporaryName } = reservation;
    await removeTemporary(temporaryName);
    await releaseStorageLease(token);
    await OperationModel.updateOne(
        {
            _id: operation._id,
            entries: { $elemMatch: { id: entry.id, receiveToken: token, state: "receiving" } },
        },
        {
            $set: {
                [`entries.${index}.state`]: "failed",
                [`entries.${index}.error`]: {
                    code: error?.code || "UPLOAD_INTERRUPTED",
                    message: "The file was not received. Retry this file.",
                },
            },
            $inc: { receivingCount: -1, revision: 1 },
        },
    );
}

export async function receiveComplete(reservation, file) {
    const { operation, entry, index, token, temporaryName } = reservation;
    if (
        !file ||
        file.path !== temporaryPath(temporaryName) ||
        file.originalname !== entry.name ||
        file.size !== entry.size
    )
        throw new AppError(
            400,
            "The received file does not match its manifest",
            "UPLOAD_SIZE_MISMATCH",
        );
    const hash = createHash("sha256");
    for await (const bytes of createReadStream(file.path, {
        flags: constants.O_RDONLY | constants.O_NOFOLLOW,
    }))
        hash.update(bytes);
    const sha256 = hash.digest("hex");
    if (entry.sha256 && entry.sha256 !== sha256)
        throw new AppError(409, "Retry with the same file contents", "UPLOAD_CONTENT_CHANGED");
    const result = await OperationModel.updateOne(
        {
            _id: operation._id,
            cancelRequested: false,
            entries: { $elemMatch: { id: entry.id, receiveToken: token, state: "receiving" } },
        },
        {
            $set: {
                [`entries.${index}.state`]: "queued",
                [`entries.${index}.sha256`]: sha256,
                [`entries.${index}.receivedAt`]: new Date(),
                status: "queued",
                nextRunAt: new Date(),
            },
            $unset: { [`entries.${index}.error`]: 1 },
            $inc: { receivingCount: -1, revision: 1 },
        },
    );
    if (!result.modifiedCount)
        throw new AppError(409, "The upload was cancelled or interrupted", "UPLOAD_CANCELLED");
}

async function publishFile(operation, entry, checkpoint) {
    const existing = await FileModel.findById(entry.fileId);
    if (existing?.resourceState === "ready" && existing.uploadOperation === operation._id) return;
    const currentRequest = await operationActor(operation);
    const courses = await relatedCourses(currentRequest, [operation.target.code]);
    await checkpoint();
    await OperationModel.updateOne(
        { _id: operation._id, leaseToken: operation.leaseToken },
        { $set: { courses } },
    );
    await withCourseLocks(
        courses,
        async (lock) => {
            const req = await operationActor(operation);
            const context = await requireFolder(
                req,
                operation.target.folderId,
                operation.target.code,
                "canContribute",
            );
            const currentCourses = await relatedCourses(req, [operation.target.code]);
            if (currentCourses.some((code) => !courses.includes(code)))
                throw new AppError(
                    409,
                    "Course sharing changed. Retry the unfinished file.",
                    "COURSE_BUSY",
                );
            await checkpoint();
            await lock.assertHeld();
            await ensureContribution(operation);
            await FileModel.updateOne(
                { _id: entry.fileId },
                {
                    $setOnInsert: {
                        name: entry.name,
                        contributorName: operation.target.contributorName,
                        size: String(entry.size),
                        sizeBytes: entry.size,
                        fileId: entry.providerId,
                        resourceState: "uploading",
                        uploadOperation: operation._id,
                        isVerified: context.capabilities.canManage,
                    },
                },
                { upsert: true, runValidators: true },
            );
            await checkpoint();
            await lock.assertHeld();
            const parent = await FolderModel.updateOne(
                { _id: operation.target.folderId, deletingOperation: { $exists: false } },
                { $addToSet: { children: entry.fileId } },
            );
            if (!parent.matchedCount)
                throw new AppError(
                    404,
                    "The upload folder is no longer available",
                    "UPLOAD_TARGET_REMOVED",
                );
            await Contribution.updateOne(
                { _id: operation.target.contributionId },
                { $addToSet: { files: entry.fileId } },
            );
            await checkpoint();
            await lock.assertHeld();
            await FileModel.updateOne(
                { _id: entry.fileId, uploadOperation: operation._id },
                { $set: { resourceState: "ready", isVerified: context.capabilities.canManage } },
            );
            const saved = await Contribution.findById(operation.target.contributionId).populate(
                "files",
            );
            await Contribution.updateOne(
                { _id: saved._id },
                {
                    $set: {
                        approved:
                            saved.files.length > 0 && saved.files.every((file) => file.isVerified),
                    },
                },
            );
        },
        { owner: operation._id, durable: true },
    );
}

async function cleanupUnpublished(operation, entry) {
    const file = await FileModel.findById(entry.fileId);
    if (file?.resourceState === "ready") return true;
    if (!file && !entry.providerId && !entry.sessionUrl && !entry.sha256) return false;
    await storage.cancelSession(entry.sessionUrl);
    const remote = entry.providerId
        ? { id: entry.providerId }
        : await storage.findUpload(entry.remoteName, entry.size);
    if (remote) await storage.remove(remote.id);
    if (file) {
        await FolderModel.updateMany(
            { children: entry.fileId },
            { $pull: { children: entry.fileId } },
        );
        await Contribution.updateMany({ files: entry.fileId }, { $pull: { files: entry.fileId } });
        await FileModel.deleteOne({
            _id: entry.fileId,
            uploadOperation: operation._id,
            resourceState: "uploading",
        });
    }
    return false;
}

export async function runUploads(operation, checkpoint) {
    let publication = Promise.resolve();
    const update = (index, fields) =>
        OperationModel.updateOne(
            { _id: operation._id, leaseToken: operation.leaseToken },
            {
                $set: Object.fromEntries(
                    Object.entries(fields).map(([key, value]) => [
                        `entries.${index}.${key}`,
                        value,
                    ]),
                ),
                $inc: { revision: 1 },
            },
        );
    const processFile = async (entry, index) => {
        let current = await OperationModel.findById(operation._id);
        const cancelled = current.cancelRequested;
        if (
            entry.state === "completed" ||
            entry.state === "cancelled" ||
            entry.state === "receiving"
        )
            return;
        if (!cancelled && !["queued", "uploading", "publishing", "cleanup"].includes(entry.state))
            return;
        try {
            await checkpoint();
            if (entry.state === "cleanup") {
                const published = await cleanupUnpublished(operation, entry);
                await update(index, {
                    state: published ? "completed" : "failed",
                    published,
                    providerId: published ? entry.providerId : null,
                    sessionUrl: null,
                    error: published
                        ? undefined
                        : {
                              code: "UPLOAD_TARGET_UNAVAILABLE",
                              message:
                                  "This destination is no longer available. Unpublished storage was removed.",
                          },
                });
                return;
            }
            if (cancelled) {
                const published = await cleanupUnpublished(operation, entry);
                await update(index, { state: published ? "completed" : "cancelled", published });
                return;
            }
            await update(index, { state: "uploading" });
            const checkCancelled = async () => {
                await checkpoint();
                const data = await OperationModel.findById(operation._id)
                    .select("cancelRequested")
                    .lean();
                if (data.cancelRequested)
                    throw new AppError(409, "Upload cancelled", "UPLOAD_CANCELLED");
            };
            const ready = await FileModel.findById(entry.fileId);
            if (ready?.resourceState === "ready" && ready.uploadOperation === operation._id) {
                await update(index, {
                    state: "completed",
                    published: true,
                    uploadedBytes: entry.size,
                });
                return;
            }
            const remote = entry.providerId
                ? { id: entry.providerId }
                : await storage.upload({
                      filename: temporaryPath(entry.temporaryName),
                      remoteName: entry.remoteName,
                      size: entry.size,
                      sessionUrl: entry.sessionUrl,
                      checkCancelled,
                      onSession: (sessionUrl) => {
                          entry.sessionUrl = sessionUrl;
                          return update(index, { sessionUrl });
                      },
                      onProgress: (uploadedBytes) => update(index, { uploadedBytes }),
                  });
            entry.providerId = remote.id;
            await update(index, { providerId: remote.id, state: "publishing" });
            await checkCancelled();
            const publish = publication.then(() => publishFile(operation, entry, checkpoint));
            publication = publish.catch(() => {});
            await publish;
            await update(index, { state: "completed", published: true, uploadedBytes: entry.size });
        } catch (error) {
            await checkpoint();
            current = await OperationModel.findById(operation._id);
            if (current.cancelRequested || error.code === "UPLOAD_CANCELLED") {
                const published = await cleanupUnpublished(operation, entry);
                await update(index, { state: published ? "completed" : "cancelled", published });
            } else {
                if (error instanceof AppError && [403, 404].includes(error.status)) {
                    await update(index, {
                        state: "cleanup",
                        error: {
                            code: "UPLOAD_TARGET_UNAVAILABLE",
                            message:
                                "This destination is no longer available. Unpublished storage is being cleaned up.",
                        },
                    });
                    const published = await cleanupUnpublished(operation, entry);
                    await update(index, {
                        state: published ? "completed" : "failed",
                        published,
                        providerId: published ? entry.providerId : null,
                        sessionUrl: null,
                        error: published
                            ? undefined
                            : {
                                  code: "UPLOAD_TARGET_UNAVAILABLE",
                                  message:
                                      "This destination is no longer available. Unpublished storage was removed.",
                              },
                    });
                    return;
                }
                await update(index, {
                    state: "failed",
                    error: {
                        code: error.code || "UPLOAD_FAILED",
                        message: "This file could not be uploaded. Retry this file.",
                    },
                });
            }
        } finally {
            await checkpoint();
            await removeTemporary(entry.temporaryName);
            await releaseStorageLease(entry.receiveToken);
        }
    };
    const work = operation.entries.map((entry, index) => ({ entry, index }));
    const outcomes = await Promise.allSettled(
        Array.from({ length: uploadLimits.concurrentFiles }, async () => {
            while (work.length) {
                const { entry, index } = work.shift();
                await processFile(entry, index);
            }
        }),
    );
    const failure = outcomes.find((result) => result.status === "rejected");
    if (failure) throw failure.reason;
    for (;;) {
        await checkpoint();
        const latest = await OperationModel.findById(operation._id);
        const states = latest.entries.map((entry) => entry.state);
        const status = states.every((state) => state === "completed")
            ? "completed"
            : latest.cancelRequested
              ? states.includes("receiving")
                  ? "cancelling"
                  : "cancelled"
              : states.some((state) =>
                      ["queued", "uploading", "publishing", "cleanup"].includes(state),
                  )
                ? "queued"
                : states.some((state) => ["pending", "receiving"].includes(state))
                  ? "awaiting"
                  : states.includes("completed")
                    ? "partial"
                    : "failed";
        const finished = await OperationModel.updateOne(
            {
                _id: operation._id,
                leaseToken: operation.leaseToken,
                revision: latest.revision,
                cancelRequested: latest.cancelRequested,
            },
            {
                $set: { status, nextRunAt: new Date(Date.now() + 1000) },
                $unset: { leaseToken: 1, leaseUntil: 1, error: 1 },
            },
        );
        if (finished.modifiedCount) {
            await releaseCourseLocks(operation._id);
            if (["cancelled", "failed"].includes(status))
                await Contribution.deleteOne({
                    _id: operation.target.contributionId,
                    operationId: operation._id,
                    files: { $size: 0 },
                });
            break;
        }
    }
}

export async function recoverReceiving() {
    const stale = await OperationModel.find({
        kind: "upload",
        entries: { $elemMatch: { state: "receiving", receiveUntil: { $lte: new Date() } } },
    });
    for (const operation of stale)
        for (const [index, entry] of operation.entries.entries()) {
            if (entry.state !== "receiving" || entry.receiveUntil > new Date()) continue;
            await receiveFailed({
                operation,
                entry,
                index,
                token: entry.receiveToken,
                temporaryName: entry.temporaryName,
            });
        }
}
