import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import Course from "../../modules/course/course.model.js";
import CourseIdentity from "../../modules/course/courseIdentity.model.js";
import BR from "../../modules/br/br.model.js";
import Admin from "../../modules/admin/admin.model.js";
import User from "../../modules/user/user.model.js";
import { OperationModel } from "../../modules/operation/operation.model.js";
import { processOperation } from "../../services/operationWorker.js";
import { runImport } from "../../services/imports.js";
import AppError from "../../utils/appError.js";
import { parseImportCsv } from "@coursehub/domain";
import { sessionHeaders } from "../fixtures/sessions.js";
import { student } from "../fixtures/library.js";
export async function exerciseImports(t, origin) {
    const admin = await Admin.create({
            userId: "import-admin",
            password: "synthetic-import-password",
        }),
        headers = {
            ...(await sessionHeaders(admin.id, "admin")),
            "content-type": "application/json",
        };
    const course = await Course.create({ code: "QA.IMPORT", name: "Original title" });
    const owner = await User.create({
        ...student,
        _id: undefined,
        email: "import-owner@example.test",
        rollNumber: 240199991,
        courses: [{ code: course.code, name: course.name }],
    });
    t.after(async () => {
        await Course.deleteMany({ code: /^QA\.IMPORT/ });
        await CourseIdentity.deleteMany({ _id: /^QA\.IMPORT/ });
        await BR.deleteMany({ email: /^import-/i });
        await User.deleteOne({ _id: owner._id });
        await Admin.deleteOne({ _id: admin._id });
        await OperationModel.deleteMany({ actorId: admin._id });
    });
    const post = async (path, body, status = 200) => {
        const response = await fetch(origin + path, {
            method: "POST",
            headers,
            body: JSON.stringify(body),
        });
        const data = await response.json();
        assert.equal(response.status, status, JSON.stringify(data));
        return data;
    };
    const prepare = async (type, rows) => {
        const preview = await post("/api/admin/imports/preview", { type, rows });
        return { type, rows, previewDigest: preview.digest, requestId: preview.requestId };
    };
    const finish = async (id) => {
        for (let i = 0; i < 25; i++) {
            await OperationModel.updateOne({ _id: id }, { $set: { nextRunAt: new Date(0) } });
            await processOperation(id);
            const op = await OperationModel.findById(id);
            if (["completed", "partial", "failed"].includes(op.status)) return op;
            for (const row of op.plan.rows) {
                if (row.childId) {
                    await OperationModel.updateOne(
                        { _id: row.childId },
                        { $set: { nextRunAt: new Date(0) } },
                    );
                    await processOperation(row.childId);
                }
            }
        }
        throw new Error("Import did not reach a terminal state");
    };
    const get = async (id) => {
        const response = await fetch(origin + "/api/operations/" + id, { headers });
        assert.equal(response.status, 200);
        return response.json();
    };
    await t.test(
        "quoted rows use one workflow, update references and repeat without duplicate work",
        async () => {
            const parsed = parseImportCsv(
                'code,name\nQA.IMPORT,"Analysis, examples\nand proofs"\nQA.IMPORT.NEW,New course\nqa.import.new,New course\n',
                "courses",
            );
            assert.deepEqual(parsed.errors, []);
            const body = await prepare("courses", parsed.rows),
                accepted = await post("/api/admin/imports/", body, 202);
            assert.equal(
                (await post("/api/admin/imports/", body, 202)).operationId,
                accepted.operationId,
            );
            const done = await finish(accepted.operationId);
            assert.equal(done.status, "completed");
            const result = await get(done.id);
            assert.deepEqual(
                result.import.rows.map((row) => row.state),
                ["updated", "created", "skipped"],
            );
            assert.equal(
                (await User.findById(owner._id)).courses[0].name,
                "Analysis, examples\nand proofs",
            );
            assert.equal((await post("/api/admin/imports/", body, 202)).operationId, done.id);
            assert.equal(await Course.countDocuments({ code: "QA.IMPORT.NEW" }), 1);
            const again = await post(
                "/api/admin/imports/",
                await prepare("courses", parsed.rows),
                202,
            );
            await finish(again.operationId);
            assert.equal((await get(again.operationId)).import.counts.skipped, 3);
        },
    );
    await t.test(
        "runtime partial failure retries only unfinished rows and preserves successful identities",
        async () => {
            const rows = [
                { code: "QA.IMPORT.OK", name: "Saved row" },
                { code: "QA.IMPORT.FAIL", name: "Retry row" },
            ];
            const accepted = await post("/api/admin/imports/", await prepare("courses", rows), 202);
            const create = Course.create.bind(Course),
                mock = t.mock.method(Course, "create", async (value) => {
                    if (value.code === "QA.IMPORT.FAIL") throw new Error("private write failure");
                    return create(value);
                });
            await finish(accepted.operationId);
            mock.mock.restore();
            const partial = await get(accepted.operationId);
            assert.equal(partial.status, "partial");
            assert.equal(partial.import.counts.created, 1);
            assert.equal(partial.import.counts.failed, 1);
            assert.doesNotMatch(JSON.stringify(partial), /private write failure/);
            const saved = await Course.findOne({ code: "QA.IMPORT.OK" });
            await post("/api/operations/" + accepted.operationId + "/retry", {}, 202);
            await finish(accepted.operationId);
            assert.equal((await get(accepted.operationId)).import.counts.created, 2);
            assert.equal(
                String((await Course.findOne({ code: "QA.IMPORT.OK" }))._id),
                String(saved._id),
            );
        },
    );
    await t.test(
        "an interruption after a row write resumes using its preassigned identity",
        async () => {
            const accepted = await post(
                "/api/admin/imports/",
                await prepare("courses", [{ code: "QA.IMPORT.CRASH", name: "Interrupted row" }]),
                202,
            );
            const token = randomUUID();
            await OperationModel.updateOne(
                { _id: accepted.operationId },
                { $set: { leaseToken: token, status: "running" } },
            );
            const operation = await OperationModel.findById(accepted.operationId);
            let stopped = false;
            await assert.rejects(
                runImport(operation, async () => {
                    if (!stopped && (await Course.exists({ code: "QA.IMPORT.CRASH" }))) {
                        stopped = true;
                        throw new AppError(409, "Synthetic interruption", "LEASE_LOST");
                    }
                }),
                { code: "LEASE_LOST" },
            );
            const written = await Course.findOne({ code: "QA.IMPORT.CRASH" });
            await OperationModel.updateOne(
                { _id: operation.id },
                { $unset: { leaseToken: 1, leaseUntil: 1 }, $set: { status: "queued" } },
            );
            await finish(operation.id);
            assert.equal((await get(operation.id)).import.counts.created, 1);
            assert.equal(await Course.countDocuments({ code: "QA.IMPORT.CRASH" }), 1);
            assert.equal(
                String((await Course.findOne({ code: "QA.IMPORT.CRASH" }))._id),
                String(written._id),
            );
        },
    );
    await t.test(
        "BR imports normalize and skip duplicates while registry assignment and sync stay distinct",
        async () => {
            const parsed = parseImportCsv(
                'email\n"IMPORT-OWNER@EXAMPLE.TEST"\nimport-owner@example.test\nimport-pending@example.test\n',
                "brs",
            );
            const accepted = await post(
                "/api/admin/imports/",
                await prepare("brs", parsed.rows),
                202,
            );
            await finish(accepted.operationId);
            const result = await get(accepted.operationId);
            assert.equal(result.import.counts.created, 2);
            assert.equal(result.import.counts.skipped, 1);
            assert.ok(result.import.rows[0].synchronization);
            assert.equal(
                (await OperationModel.findById(result.import.rows[0].synchronization)).status,
                "queued",
            );
            assert.ok(await BR.exists({ email: "import-pending@example.test" }));
            const repeat = await post(
                "/api/admin/imports/",
                await prepare("brs", parsed.rows),
                202,
            );
            await finish(repeat.operationId);
            assert.equal((await get(repeat.operationId)).import.counts.skipped, 3);
            await BR.create({ email: "IMPORT-CASE@EXAMPLE.TEST" });
            const existingCase = await post("/api/admin/imports/preview", {
                type: "brs",
                rows: [{ email: "import-case@example.test" }],
            });
            assert.equal(existingCase.rows[0].action, "skip");
            const removed = await fetch(origin + "/api/br/delete", {
                method: "DELETE",
                headers,
                body: JSON.stringify({ email: "IMPORT-CASE@EXAMPLE.TEST" }),
            });
            assert.equal(removed.status, 200);
            assert.equal(await BR.exists({ email: "IMPORT-CASE@EXAMPLE.TEST" }), null);
        },
    );
    await t.test(
        "stale previews, malformed plans and unauthenticated imports cannot mutate data",
        async () => {
            const body = await prepare("courses", [{ code: course.code, name: "Another title" }]);
            await Course.updateOne(
                { _id: course._id },
                { $set: { name: "Concurrent saved title" } },
            );
            await post("/api/admin/imports/", body, 409);
            await post(
                "/api/admin/imports/preview",
                { type: "courses", rows: [{ code: "../bad", name: "Invalid" }] },
                400,
            );
            await post("/api/admin/imports/preview", null, 400);
            await post(
                "/api/admin/imports/preview",
                { type: "brs", rows: [{ email: "bad" }] },
                400,
            );
            await post(
                "/api/admin/imports/preview",
                { type: "courses", rows: Array(1001).fill({ code: "QA.IMPORT", name: "Name" }) },
                400,
            );
            assert.equal(
                (
                    await fetch(origin + "/api/admin/imports/preview", {
                        method: "POST",
                        headers: { "content-type": "application/json" },
                        body: "{}",
                    })
                ).status,
                401,
            );
            const studentHeaders = {
                ...(await sessionHeaders(owner.id)),
                "content-type": "application/json",
            };
            assert.equal(
                (
                    await fetch(origin + "/api/admin/imports/preview", {
                        method: "POST",
                        headers: studentHeaders,
                        body: "{}",
                    })
                ).status,
                403,
            );
            const operation = await OperationModel.findOne({ kind: "import", actorId: admin._id });
            assert.equal(
                (
                    await fetch(origin + "/api/operations/" + operation.id, {
                        headers: studentHeaders,
                    })
                ).status,
                404,
            );
        },
    );
    await t.test(
        "failed course-reference child operations resume their journal through import retry",
        async () => {
            const linked = await Course.create({
                code: "QA.IMPORT.RECOVER",
                name: "Before recovery",
            });
            await User.updateOne(
                { _id: owner._id },
                { $push: { readOnly: { code: linked.code, name: linked.name } } },
            );
            const body = await prepare("courses", [{ code: linked.code, name: "After recovery" }]);
            const requests = await Promise.all([
                post("/api/admin/imports/", body, 202),
                post("/api/admin/imports/", body, 202),
            ]);
            assert.equal(requests[0].operationId, requests[1].operationId);
            const update = User.collection.updateMany.bind(User.collection);
            let injected = false;
            const mock = t.mock.method(User.collection, "updateMany", async (filter, ...args) => {
                if (!injected) {
                    injected = true;
                    throw new AppError(409, "Synthetic reference failure", "REFERENCE_FAILURE");
                }
                return update(filter, ...args);
            });
            await finish(requests[0].operationId);
            mock.mock.restore();
            const failed = await get(requests[0].operationId);
            assert.equal(failed.status, "failed");
            const child = await OperationModel.findById(failed.import.rows[0].operationId);
            assert.ok(child.plan);
            assert.ok(child.completedSteps.length);
            await post("/api/operations/" + failed.id + "/retry", {}, 202);
            await finish(failed.id);
            const done = await get(failed.id);
            assert.equal(done.status, "completed");
            assert.equal(done.import.rows[0].operationId, child.id);
            assert.equal(
                (await User.findById(owner._id)).readOnly.find((item) => item.code === linked.code)
                    .name,
                "After recovery",
            );
        },
    );
    await t.test(
        "a fresh reviewed intent can reassign a removed BR while reused request IDs reject different plans",
        async () => {
            const rows = [{ email: "import-reassign@example.test" }];
            const firstBody = await prepare("brs", rows),
                first = await post("/api/admin/imports/", firstBody, 202);
            await finish(first.operationId);
            await post(
                "/api/admin/imports/",
                { ...firstBody, rows: [{ email: "import-different@example.test" }] },
                409,
            );
            await BR.deleteOne({ email: rows[0].email });
            const secondBody = await prepare("brs", rows);
            assert.notEqual(firstBody.requestId, secondBody.requestId);
            const second = await post("/api/admin/imports/", secondBody, 202);
            assert.notEqual(first.operationId, second.operationId);
            await finish(second.operationId);
            assert.equal((await get(second.operationId)).import.counts.created, 1);
            assert.ok(await BR.exists({ email: rows[0].email }));
        },
    );
}
