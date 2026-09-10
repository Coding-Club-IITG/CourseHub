import User from "../../modules/user/user.model.js";
import { student } from "../fixtures/library.js";
import assert from "node:assert/strict";
import Admin from "../../modules/admin/admin.model.js";
import Course from "../../modules/course/course.model.js";
import { OperationModel } from "../../modules/operation/operation.model.js";
import { presentOperation } from "../../modules/operation/operation.controller.js";
import { sessionHeaders } from "../fixtures/sessions.js";
export async function exerciseLinkReceipts(t, origin) {
    const admin = await Admin.create({ userId: "receipt-admin", password: "synthetic-password" }),
        courses = await Course.insertMany([
            { code: "QA.RECEIPTA", name: "Source" },
            { code: "QA.RECEIPTB", name: "Target" },
        ]),
        headers = await sessionHeaders(admin.id, "admin");
    t.after(async () => {
        await OperationModel.deleteMany({ actorId: admin._id });
        await Course.deleteMany({ _id: { $in: courses.map((item) => item._id) } });
        await Admin.deleteOne({ _id: admin._id });
    });
    const post = async (text) => {
        const body = new FormData();
        body.append("file", new Blob([text]), "links.csv");
        return fetch(origin + "/api/admin/courses/bulk-link", { method: "POST", headers, body });
    };
    const studentRecord = await User.create({
        ...student,
        _id: admin._id,
        rollNumber: 240909099,
        email: "receipt-student@example.test",
    });
    t.after(() => User.deleteOne({ _id: studentRecord._id }));
    const response = await post("\uFEFFoldCode,newCode\nQA.RECEIPTA,QA.RECEIPTB\nOnlyOneColumn\n");
    assert.equal(response.status, 202);
    const { summary } = await response.json();
    assert.equal(summary.scheduled, 1);
    assert.equal(summary.failed, 1);
    assert.notEqual(summary.receiptId, summary.operations[0].operationId);
    const receiptResponse = await fetch(origin + "/api/operations/" + summary.receiptId, {
        headers,
    });
    assert.equal(receiptResponse.status, 200);
    const receipt = await receiptResponse.json();
    assert.deepEqual(receipt.batchLinking, summary);
    assert.equal(receipt.name, "Bulk link scheduling");
    assert.equal(receipt.status, "completed");
    assert.equal(receipt.canRetry, false);
    const job = await OperationModel.findById(summary.operations[0].operationId);
    assert.equal(job.status, "queued");
    assert.equal(receipt.linking, undefined);
    const studentHeaders = await sessionHeaders(studentRecord.id, "student");
    assert.equal(
        (await fetch(origin + "/api/operations/" + summary.receiptId, { headers: studentHeaders }))
            .status,
        404,
    );
    const studentList = await (
        await fetch(origin + "/api/operations", { headers: studentHeaders })
    ).json();
    assert.ok(studentList.items.every((item) => item.id !== summary.receiptId));
    const stored = await OperationModel.findById(summary.receiptId);
    assert.equal(presentOperation(stored, { id: admin.id, admin: false }).batchLinking, undefined);
    const again = await post("QA.RECEIPTA,QA.RECEIPTB\n");
    const next = (await again.json()).summary;
    assert.notEqual(next.receiptId, summary.receiptId);
    assert.equal(next.operations[0].operationId, job.id);
    assert.deepEqual(
        (await OperationModel.findById(summary.receiptId)).target.batchLinking,
        summary,
    );
    const count = await OperationModel.countDocuments({ actorId: admin._id });
    assert.equal((await post("QA.RECEIPTA,QA.RECEIPTB\n".repeat(1001))).status, 413);
    assert.equal((await post("x".repeat(1024 * 1024 + 1))).status, 413);
    assert.equal(await OperationModel.countDocuments({ actorId: admin._id }), count);
}
