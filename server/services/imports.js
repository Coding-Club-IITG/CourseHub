import { createHash, randomUUID } from "node:crypto";
import mongoose from "mongoose";
import { validateImportRows, normalizeCourseCode } from "@coursehub/domain";
import Course from "../modules/course/course.model.js";
import BR from "../modules/br/br.model.js";
import { OperationModel } from "../modules/operation/operation.model.js";
import { actorFor } from "./authorization.js";
import {
    codeReferenceRegex,
    assertCourseIdentityAvailable,
    rememberCourseCodes,
} from "./courseIdentity.js";
import { mutateContent } from "./contentMutation.js";
import { scheduleCourseRename } from "./courseReferences.js";
import { assignBR } from "./brAssignments.js";
import { completeOperation } from "./operationJournal.js";
import { safeError } from "../middleware/requestErrors.js";
import AppError from "../utils/appError.js";
const digest = (value) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const accepted = (op) => ({
    operationId: op._id,
    kind: "import",
    status: op.status,
    statusUrl: "/api/operations/" + op._id,
});
function validate(type, input) {
    const result = validateImportRows(type, input);
    if (result.errors.length)
        throw new AppError(
            400,
            result.errors
                .map((e) => `Row ${e.row}: ${e.message}`)
                .slice(0, 5)
                .join(" "),
            "INVALID_IMPORT",
        );
    return result.rows;
}
export async function previewImport(req, body = {}) {
    if (!body || typeof body !== "object" || Array.isArray(body))
        throw new AppError(400, "Supply an import plan.", "INVALID_IMPORT");
    const actor = await actorFor(req);
    if (!actor.admin) throw new AppError(403, "Administrator access is required");
    const rows = validate(body.type, body.rows),
        plan = [];
    for (const row of rows) {
        if (row.duplicateOf) {
            plan.push({
                ...row,
                action: "skip",
                message: `Repeated row; same as row ${row.duplicateOf}.`,
            });
            continue;
        }
        if (body.type === "courses") {
            const matches = await Course.find({ code: codeReferenceRegex(row.code) })
                .select("_id code name changingOperation deletingOperation")
                .lean();
            if (matches.length > 1) {
                plan.push({
                    ...row,
                    action: "conflict",
                    message: "Duplicate course identities need review.",
                });
                continue;
            }
            const course = matches[0];
            try {
                await assertCourseIdentityAvailable(row.code, course?._id);
            } catch (error) {
                if (!(error instanceof AppError)) throw error;
                plan.push({ ...row, action: "conflict", message: error.message });
                continue;
            }
            if (course?.changingOperation || course?.deletingOperation) {
                plan.push({
                    ...row,
                    action: "conflict",
                    message: "A course operation is still in progress.",
                });
                continue;
            }
            plan.push({
                ...row,
                action: !course ? "create" : course.name === row.name ? "skip" : "update",
                ...(course ? { courseId: String(course._id), previousName: course.name } : {}),
            });
        } else {
            const br = await BR.findOne({ email: row.email })
                .collation({ locale: "en", strength: 2 })
                .lean();
            plan.push({
                ...row,
                action: br ? "skip" : "create",
                ...(br ? { recordId: String(br._id) } : {}),
            });
        }
    }
    return {
        type: body.type,
        rows: plan,
        digest: digest({ type: body.type, rows: plan }),
        requestId: randomUUID(),
        canSubmit: !plan.some((row) => row.action === "conflict"),
    };
}
export async function scheduleImport(req, body = {}) {
    if (!body || typeof body !== "object" || Array.isArray(body))
        throw new AppError(400, "Supply an import plan.", "INVALID_IMPORT");
    const actor = await actorFor(req);
    if (!actor.admin) throw new AppError(403, "Administrator access is required");
    const rows = validate(body.type, body.rows);
    if (typeof body.previewDigest !== "string" || !/^[a-f0-9]{64}$/.test(body.previewDigest))
        throw new AppError(
            400,
            "Review the import preview before submitting.",
            "IMPORT_PREVIEW_REQUIRED",
        );
    if (typeof body.requestId !== "string" || !/^[a-f0-9-]{36}$/.test(body.requestId))
        throw new AppError(
            400,
            "Review a new import preview before submitting.",
            "IMPORT_PREVIEW_REQUIRED",
        );
    const fingerprint = digest({ type: body.type, rows, previewDigest: body.previewDigest });
    const requestKey = "import:" + body.requestId;
    const reuse = (operation) => {
        if (operation.target.fingerprint !== fingerprint)
            throw new AppError(
                409,
                "This import request was already used for a different plan.",
                "IMPORT_REQUEST_CONFLICT",
            );
        return accepted(operation);
    };
    const existing = await OperationModel.findOne({ actorId: actor.id, requestKey });
    if (existing) return reuse(existing);
    const preview = await previewImport(req, { type: body.type, rows });
    if (preview.digest !== body.previewDigest)
        throw new AppError(
            409,
            "The catalogue or BR registry changed. Review a fresh preview before importing.",
            "IMPORT_PREVIEW_CHANGED",
        );
    if (!preview.canSubmit)
        throw new AppError(
            409,
            "Resolve the conflicts shown in the preview before importing.",
            "IMPORT_CONFLICT",
        );
    const plan = {
        type: body.type,
        affectedCourses: body.type === "courses" ? [...new Set(rows.map((row) => row.code))] : [],
        rows: preview.rows.map((row) => ({
            ...row,
            state: "pending",
            newId: new mongoose.Types.ObjectId().toString(),
            childId: row.action === "update" ? randomUUID() : undefined,
        })),
    };
    try {
        return accepted(
            await OperationModel.create({
                _id: randomUUID(),
                kind: "import",
                actorId: actor.id,
                actorRole: "admin",
                requestKey,
                target: { type: body.type, fingerprint },
                plan,
                courses: [],
                status: "queued",
            }),
        );
    } catch (error) {
        if (error.code !== 11000) throw error;
        return reuse(await OperationModel.findOne({ actorId: actor.id, requestKey }));
    }
}
export function importResult(operation) {
    const rows = (operation.plan?.rows || []).map(
        ({ row, code, name, email, state, message, error, childId, synchronization }) => ({
            row,
            code,
            name,
            email,
            state,
            message,
            error,
            operationId: childId,
            synchronization,
        }),
    );
    const counts = Object.fromEntries(
        ["created", "updated", "skipped", "failed", "pending", "working"].map((key) => [
            key,
            rows.filter((row) => row.state === key).length,
        ]),
    );
    return {
        type: operation.target.type,
        rows,
        counts,
        total: rows.length,
        finished: counts.created + counts.updated + counts.skipped + counts.failed,
    };
}
const leaseFilter = (operation) => ({ _id: operation._id, leaseToken: operation.leaseToken });
async function saveRow(operation, index, fields, checkpoint) {
    await checkpoint();
    const result = await OperationModel.updateOne(leaseFilter(operation), {
        $set: Object.fromEntries(
            Object.entries(fields).map(([key, value]) => [`plan.rows.${index}.${key}`, value]),
        ),
    });
    if (!result.matchedCount) throw new AppError(409, "Operation lease was lost", "LEASE_LOST");
    Object.assign(operation.plan.rows[index], fields);
}
async function yieldImport(operation, checkpoint) {
    await checkpoint();
    await OperationModel.updateOne(leaseFilter(operation), {
        $set: { status: "queued", nextRunAt: new Date(Date.now() + 1000) },
        // Waiting for a child operation does not consume the failure retry budget.
        $inc: { attempts: -1 },
        $unset: { leaseToken: 1, leaseUntil: 1 },
    });
}
export async function runImport(operation, checkpoint) {
    const req = { admin: { _id: operation.actorId } };
    for (let index = 0; index < operation.plan.rows.length; index++) {
        const row = operation.plan.rows[index];
        if (["created", "updated", "skipped", "failed"].includes(row.state)) continue;
        await checkpoint();
        try {
            if (row.action === "skip") {
                await saveRow(
                    operation,
                    index,
                    { state: "skipped", message: row.message || "Already matches the saved data." },
                    checkpoint,
                );
                continue;
            }
            await saveRow(operation, index, { state: "working", error: null }, checkpoint);
            if (operation.target.type === "brs") {
                const assigned = await assignBR(row.email, req.admin, { recordId: row.newId });
                await saveRow(
                    operation,
                    index,
                    {
                        state: String(assigned.br._id) === row.newId ? "created" : "skipped",
                        message: assigned.synchronization
                            ? "BR assignment saved; course synchronization is scheduled."
                            : "BR assignment saved. Registration data is checked when the student signs in.",
                        synchronization: assigned.synchronization?.operationId || null,
                    },
                    checkpoint,
                );
            } else if (row.action === "create") {
                await mutateContent({}, [row.code], async (lock) => {
                    await checkpoint();
                    await lock.assertHeld();
                    const own = await Course.findById(row.newId);
                    if (own) {
                        if (own.code !== row.code || own.name !== row.name)
                            throw new AppError(
                                409,
                                "The created course changed. Review it before retrying.",
                                "IMPORT_COURSE_CHANGED",
                            );
                    } else {
                        await assertCourseIdentityAvailable(row.code, row.newId);
                        await Course.create({
                            _id: row.newId,
                            code: row.code,
                            name: row.name,
                            children: [],
                        });
                    }
                    await rememberCourseCodes(row.newId, [row.code]);
                });
                await saveRow(
                    operation,
                    index,
                    { state: "created", message: "Course created." },
                    checkpoint,
                );
            } else {
                const child = await OperationModel.findById(row.childId);
                if (!child) {
                    const current = await Course.findById(row.courseId);
                    if (
                        !current ||
                        normalizeCourseCode(current.code) !== row.code ||
                        current.name !== row.previousName
                    )
                        throw new AppError(
                            409,
                            "The course changed after preview. Review it before retrying.",
                            "IMPORT_COURSE_CHANGED",
                        );
                    await scheduleCourseRename(
                        req,
                        row.code,
                        { name: row.name, newCode: row.code },
                        { operationId: row.childId },
                    );
                    await yieldImport(operation, checkpoint);
                    return;
                }
                if (child.status === "completed") {
                    await saveRow(
                        operation,
                        index,
                        { state: "updated", message: "Course and saved references updated." },
                        checkpoint,
                    );
                    const affected = [
                        ...new Set([
                            ...operation.plan.affectedCourses,
                            ...(child.plan?.affectedCourses || []),
                        ]),
                    ];
                    await OperationModel.updateOne(leaseFilter(operation), {
                        $set: { "plan.affectedCourses": affected },
                    });
                    operation.plan.affectedCourses = affected;
                } else if (["failed", "cancelled"].includes(child.status)) {
                    await saveRow(
                        operation,
                        index,
                        {
                            state: "failed",
                            error: child.error || {
                                code: "IMPORT_ROW_FAILED",
                                message: "Course update could not finish.",
                            },
                        },
                        checkpoint,
                    );
                } else {
                    await yieldImport(operation, checkpoint);
                    return;
                }
            }
        } catch (error) {
            if (error.code === "LEASE_LOST") throw error;
            const failure = safeError(error);
            await saveRow(
                operation,
                index,
                { state: "failed", error: { code: failure.code, message: failure.message } },
                checkpoint,
            );
        }
    }
    const result = importResult(operation);
    if (result.counts.failed) {
        await checkpoint();
        await OperationModel.updateOne(leaseFilter(operation), {
            $set: {
                status:
                    result.counts.created + result.counts.updated + result.counts.skipped
                        ? "partial"
                        : "failed",
                error: {
                    code: "IMPORT_PARTIAL",
                    message: `${result.counts.failed} rows could not finish. Retry preserves successful rows.`,
                },
            },
            $unset: { leaseToken: 1, leaseUntil: 1 },
        });
    } else await completeOperation(operation, checkpoint);
}
export async function importRetryFields(operation) {
    const fields = {};
    for (const [index, row] of operation.plan.rows.entries()) {
        if (row.state !== "failed") continue;
        if (row.childId)
            await OperationModel.updateOne(
                { _id: row.childId, status: "failed" },
                {
                    $set: { status: "queued", nextRunAt: new Date(), attempts: 0 },
                    $unset: { error: 1 },
                    $inc: { revision: 1 },
                },
            );
        fields[`plan.rows.${index}.state`] = "pending";
        fields[`plan.rows.${index}.error`] = null;
    }
    return fields;
}
