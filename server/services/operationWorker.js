import { randomUUID } from "node:crypto";
import { OperationModel, CourseLock, StorageLease } from "../modules/operation/operation.model.js";
import { acquireStorageLease, releaseStorageLease } from "./storageLeases.js";
import { runDeletion } from "./deletions.js";
import { runUploads, recoverReceiving, removeTemporary } from "./uploads.js";
import { releaseCourseLocks } from "./courseLocks.js";
import AppError from "../utils/appError.js";
import logger from "../utils/logger.js";

export async function processOperation(id) {
    const owner = randomUUID();
    try {
        await acquireStorageLease("worker", owner, 1, 60000);
    } catch (error) {
        if (error.code === "STORAGE_BUSY") return false;
        throw error;
    }
    let lost = false;
    const timer = setInterval(() => {
        StorageLease.updateOne(
            { owner, expiresAt: { $gt: new Date() } },
            { $set: { expiresAt: new Date(Date.now() + 60000) } },
        )
            .then((result) => {
                if (!result.matchedCount) lost = true;
            })
            .catch(() => {
                lost = true;
            });
    }, 15000);
    timer.unref();
    try {
        return await processClaim(id, async () => {
            if (lost || !(await StorageLease.exists({ owner, expiresAt: { $gt: new Date() } })))
                throw new AppError(409, "Operation lease was lost", "LEASE_LOST");
        });
    } finally {
        clearInterval(timer);
        await releaseStorageLease(owner);
    }
}

async function processClaim(id, checkWorker) {
    const token = randomUUID();
    const operation = await OperationModel.findOneAndUpdate(
        {
            ...(id ? { _id: id } : {}),
            status: { $in: ["planning", "queued", "running", "cancelling"] },
            nextRunAt: { $lte: new Date() },
            $or: [{ leaseUntil: { $exists: false } }, { leaseUntil: { $lte: new Date() } }],
        },
        {
            $set: {
                status: "running",
                leaseToken: token,
                leaseUntil: new Date(Date.now() + 60000),
            },
            $inc: { attempts: 1 },
        },
        { sort: { nextRunAt: 1, createdAt: 1 }, new: true },
    );
    if (!operation) return false;
    let leaseError;
    const renew = setInterval(() => {
        OperationModel.updateOne(
            { _id: operation._id, leaseToken: token },
            { $set: { leaseUntil: new Date(Date.now() + 60000) } },
        )
            .then((result) => {
                if (!result.modifiedCount)
                    leaseError = new AppError(409, "Operation lease was lost", "LEASE_LOST");
            })
            .catch((error) => {
                leaseError = new AppError(409, "Operation lease was lost", "LEASE_LOST");
            });
    }, 15000);
    renew.unref();
    const checkpoint = async () => {
        await checkWorker();
        if (leaseError) throw leaseError;
        if (
            !(await OperationModel.exists({
                _id: operation._id,
                leaseToken: token,
                leaseUntil: { $gt: new Date() },
            }))
        )
            throw new AppError(409, "Operation lease was lost", "LEASE_LOST");
    };
    try {
        if (operation.kind === "delete") await runDeletion(operation, checkpoint);
        else await runUploads(operation, checkpoint);
    } catch (error) {
        if (error.code === "LEASE_LOST") return true;
        const current = await OperationModel.findById(operation._id);
        const busy = error.code === "COURSE_BUSY";
        const permanent = error instanceof AppError && error.status < 500 && !busy;
        const retry = busy || (!permanent && operation.attempts < 5);
        const wait = Math.max(
            error.retryAfterMs || 0,
            busy ? 1000 : Math.min(300000, 2000 * 2 ** operation.attempts),
        );
        await OperationModel.updateOne(
            { _id: operation._id, leaseToken: token },
            {
                $set: {
                    status: retry ? (current.cancelRequested ? "cancelling" : "queued") : "failed",
                    nextRunAt: new Date(Date.now() + wait),
                    error: {
                        code: error.code || "OPERATION_FAILED",
                        message: permanent
                            ? error.message
                            : "The operation could not finish. Retrying preserves completed work.",
                    },
                },
                $unset: { leaseToken: 1, leaseUntil: 1 },
                ...(busy ? { $inc: { attempts: -1 } } : {}),
            },
        );
        if (operation.kind === "delete" && !current.plan && !retry) {
            await releaseCourseLocks(operation._id);
            await OperationModel.updateOne({ _id: operation._id }, { $unset: { requestKey: 1 } });
        }
        logger.warn("Content operation needs recovery", {
            attributes: {
                operationId: operation._id,
                outcome: "failure",
                retryable: retry,
                code: error.code || "OPERATION_FAILED",
            },
        });
    } finally {
        clearInterval(renew);
    }
    return true;
}

export async function recoverLocks() {
    // Completion may have persisted immediately before a crash prevented lock release
    const owners = await CourseLock.distinct("owner", { expiresAt: null });
    const finished = await OperationModel.find({
        _id: { $in: owners },
        $or: [
            { status: { $in: ["completed", "cancelled"] } },
            {
                kind: "upload",
                status: { $in: ["failed", "partial", "awaiting"] },
                leaseUntil: { $exists: false },
            },
            { kind: "delete", status: "failed", plan: { $exists: false } },
        ],
    })
        .select("_id")
        .lean();
    for (const operation of finished) await releaseCourseLocks(operation._id);
    // A reservation is journaled before any bytes can be written
    const reservations = await StorageLease.find({
        _id: /^receive:/,
        updatedAt: { $lt: new Date(Date.now() - 300000) },
    }).lean();
    for (const lease of reservations) {
        const operation = await OperationModel.findOne({ "entries.receiveToken": lease.owner })
            .select("entries")
            .lean();
        const entry = operation?.entries.find((file) => file.receiveToken === lease.owner);
        if (!entry || ["completed", "cancelled", "failed"].includes(entry.state)) {
            if (entry) await removeTemporary(entry.temporaryName);
            await releaseStorageLease(lease.owner);
        }
    }
}

export function startOperationWorker({ intervalMs = 1000 } = {}) {
    let stopped = false;
    let timer;
    let active = Promise.resolve();
    const tick = () => {
        active = (async () => {
            try {
                await recoverReceiving();
                await recoverLocks();
                await processOperation();
            } catch {
                logger.warn("Content operation worker will retry after a database failure");
            }
            if (!stopped) {
                timer = setTimeout(tick, intervalMs);
                timer.unref();
            }
        })();
    };
    tick();
    return {
        async stop() {
            stopped = true;
            clearTimeout(timer);
            await active;
        },
    };
}
