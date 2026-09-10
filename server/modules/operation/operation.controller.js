import { importResult, importRetryFields } from "../../services/imports.js";
import { OperationModel } from "./operation.model.js";
import { actorFor } from "../../services/authorization.js";
import { uploadLimits } from "../../config/storage.js";
import AppError from "../../utils/appError.js";

export function presentOperation(operation, actor) {
    const own = String(operation.actorId) === actor.id;
    const selfSync = operation.kind === "academic-sync" && operation.target.userId === actor.id;
    return {
        id: operation._id,
        kind: operation.kind,
        status: operation.status,
        courseCode: operation.target.code,
        folderId: operation.target.folderId,
        name:
            operation.plan?.name ||
            (operation.kind === "upload"
                ? "File upload"
                : operation.kind === "import"
                  ? "CSV import"
                  : operation.kind === "link"
                    ? "Course linking"
                    : operation.kind === "rename"
                      ? "Course update"
                      : operation.kind === "academic-sync"
                        ? "Academic course refresh"
                        : "Content deletion"),
        affectedCourses:
            operation.plan?.affectedCourses ||
            (operation.target.code ? [operation.target.code] : []),
        import: operation.kind === "import" ? importResult(operation) : undefined,
        batchLinking: actor.admin ? operation.target.batchLinking : undefined,
        linking: operation.kind === "link" ? operation.plan?.result : undefined,
        synchronization: operation.kind === "academic-sync" ? operation.plan?.result : undefined,
        course:
            operation.kind === "rename" && operation.plan
                ? {
                      _id: operation.plan.courseId,
                      code: operation.plan.newCode,
                      name: operation.plan.name,
                  }
                : undefined,
        createdAt: operation.createdAt,
        updatedAt: operation.updatedAt,
        nextRunAt: operation.nextRunAt,
        error: operation.error?.message ? operation.error : undefined,
        completedSteps: operation.completedSteps.length,
        cancelRequested: operation.cancelRequested,
        canCancel:
            own &&
            operation.kind === "upload" &&
            !["completed", "cancelled"].includes(operation.status),
        canRetry:
            (actor.admin ||
                (own && operation.kind === "upload") ||
                (selfSync && !operation.target.force)) &&
            ["failed", "partial"].includes(operation.status),
        entries: operation.entries.map((entry) => ({
            id: entry.id,
            name: entry.name,
            size: entry.size,
            state: entry.state,
            uploadedBytes: entry.uploadedBytes,
            fileId: entry.published ? String(entry.fileId) : undefined,
            error:
                ["failed", "cleanup"].includes(entry.state) && entry.error?.message
                    ? entry.error
                    : undefined,
        })),
        limits: operation.kind === "upload" ? uploadLimits : undefined,
    };
}

async function permittedOperation(req) {
    const actor = await actorFor(req);
    if (!/^[a-f0-9-]{36}$/.test(req.params.id)) throw new AppError(404, "Operation not found");
    const operation = await OperationModel.findById(req.params.id);
    if (
        !operation ||
        ((operation.kind === "import" || operation.target.batchLinking) && !actor.admin) ||
        (!actor.admin &&
            String(operation.actorId) !== actor.id &&
            !(operation.kind === "academic-sync" && operation.target.userId === actor.id) &&
            !actor.managed.includes(operation.target.code) &&
            !(operation.kind === "link" && actor.managed.includes(operation.target.sourceCode)))
    )
        throw new AppError(404, "Operation not found");
    return { actor, operation };
}
export async function getOperation(req, res) {
    const { actor, operation } = await permittedOperation(req);
    res.setHeader("Cache-Control", "private, no-store");
    res.json(presentOperation(operation, actor));
}
export async function listOperations(req, res) {
    const actor = await actorFor(req);
    const page = Number(req.query.page || 1),
        pageSize = Number(req.query.pageSize || 20);
    if (
        !Number.isInteger(page) ||
        page < 1 ||
        page > 10000 ||
        !Number.isInteger(pageSize) ||
        pageSize < 1 ||
        pageSize > 100
    )
        throw new AppError(400, "Invalid operation page");
    const filter = actor.admin
        ? {}
        : {
              $or: [
                  { actorId: actor.id },
                  { kind: "academic-sync", "target.userId": actor.id },
                  { "target.code": { $in: actor.managed } },
                  { kind: "link", "target.sourceCode": { $in: actor.managed } },
              ],
          };
    if (!actor.admin) {
        filter.kind = { $ne: "import" };
        filter["target.batchLinking"] = { $exists: false };
    }
    if (req.query.status) {
        if (
            ![
                "failed",
                "partial",
                "running",
                "queued",
                "completed",
                "awaiting",
                "cancelled",
                "cancelling",
            ].includes(req.query.status)
        )
            throw new AppError(400, "Invalid operation status");
        filter.status = req.query.status;
    }
    const [items, total] = await Promise.all([
        OperationModel.find(filter)
            .sort({ createdAt: -1 })
            .skip((page - 1) * pageSize)
            .limit(pageSize),
        OperationModel.countDocuments(filter),
    ]);
    res.setHeader("Cache-Control", "private, no-store");
    res.json({ items: items.map((item) => presentOperation(item, actor)), page, pageSize, total });
}
export async function cancelOperation(req, res) {
    const { actor, operation } = await permittedOperation(req);
    if (operation.kind !== "upload" || String(operation.actorId) !== actor.id)
        throw new AppError(403, "Only the uploader can cancel this batch");
    if (!["completed", "cancelled"].includes(operation.status))
        await OperationModel.updateOne(
            { _id: operation._id },
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
    res.status(202).json(presentOperation(await OperationModel.findById(operation._id), actor));
}
export async function retryOperation(req, res) {
    const { actor, operation } = await permittedOperation(req);
    const selfSync =
        operation.kind === "academic-sync" &&
        operation.target.userId === actor.id &&
        !operation.target.force;
    if (
        !actor.admin &&
        !selfSync &&
        (operation.kind !== "upload" || String(operation.actorId) !== actor.id)
    )
        throw new AppError(403, "Administrator access is required to retry this operation");
    if (!["failed", "partial"].includes(operation.status))
        throw new AppError(409, "This operation is not waiting for retry");
    const fields = {
        ...(operation.kind === "import" ? await importRetryFields(operation) : {}),
        status:
            operation.kind !== "upload"
                ? "queued"
                : operation.cancelRequested
                  ? "cancelling"
                  : "awaiting",
        nextRunAt: new Date(),
        attempts: 0,
    };
    if (operation.kind === "upload" && !operation.cancelRequested)
        operation.entries.forEach((entry, index) => {
            if (["cleanup", "uploading", "publishing", "queued"].includes(entry.state))
                fields.status = "queued";
            if (entry.state === "failed") {
                fields[`entries.${index}.state`] = entry.providerId ? "queued" : "pending";
                if (entry.providerId) fields.status = "queued";
            }
        });
    await OperationModel.updateOne(
        { _id: operation._id, status: operation.status },
        { $set: fields, $unset: { error: 1 }, $inc: { revision: 1 } },
    );
    res.status(202).json(presentOperation(await OperationModel.findById(operation._id), actor));
}
