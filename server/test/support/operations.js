import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import http from "node:http";
import { once } from "node:events";
import { Readable } from "node:stream";
import User from "../../modules/user/user.model.js";
import Admin from "../../modules/admin/admin.model.js";
import BR from "../../modules/br/br.model.js";
import CourseAllotment from "../../modules/course/courseAllotment.model.js";
import Course, { FolderModel, FileModel } from "../../modules/course/course.model.js";
import Contribution from "../../modules/contribution/contribution.model.js";
import {
    OperationModel,
    CourseLock,
    StorageLease,
} from "../../modules/operation/operation.model.js";
import { academicPeriod } from "../../services/authorization.js";
import { processOperation, recoverLocks } from "../../services/operationWorker.js";
import {
    reserveUpload,
    receiveFailed,
    recoverReceiving,
    temporaryPath,
} from "../../services/uploads.js";
import { acquireCourseLocks } from "../../services/courseLocks.js";
import { storage } from "../../services/storage.js";
import { StorageError } from "../../services/graphClient.js";
import getImageKit from "../../services/imagekit.js";
import { uploadDirectory, uploadLimits } from "../../config/storage.js";
import { sessionHeaders } from "../fixtures/sessions.js";
import { student } from "../fixtures/library.js";
import AppError from "../../utils/appError.js";

export async function exerciseOperations(t, origin) {
    let serial = 0;
    async function fixture() {
        const number = ++serial;
        const code = `JOUR${number}01`,
            sharedCode = `JOUR${number}02`;
        const { _id, ...base } = student;
        const owner = await User.create({
            ...base,
            email: `journal${number}@example.test`,
            rollNumber: 298000000 + number,
        });
        const manager = await User.create({
            ...base,
            email: `journal-br${number}@example.test`,
            rollNumber: 297000000 + number,
        });
        await BR.create({ email: manager.email });
        for (const person of [owner, manager])
            await CourseAllotment.create({
                rollNumber: person.rollNumber,
                ...academicPeriod(),
                courses: [code],
            });
        const folder = await FolderModel.create({
            name: "Shared lecture notes",
            courses: [code, sharedCode],
            childType: "File",
            children: [],
        });
        const root = await FolderModel.create({
            name: "2026",
            courses: [code, sharedCode],
            childType: "Folder",
            children: [folder._id],
        });
        await Course.create([
            { code, name: "Journal test", children: [root._id] },
            { code: sharedCode, name: "Linked journal test", children: [root._id] },
        ]);
        const admin = await Admin.findOne();
        return {
            code,
            sharedCode,
            owner,
            manager,
            folder,
            root,
            ownerHeaders: await sessionHeaders(owner.id),
            managerHeaders: await sessionHeaders(manager.id),
            adminHeaders: await sessionHeaders(admin.id, "admin"),
        };
    }
    const send = async (headers, path, method = "GET", body, status = 200, extra = {}) => {
        const response = await fetch(origin + path, {
            method,
            headers: {
                ...headers,
                ...(body ? { "content-type": "application/json" } : {}),
                ...extra,
            },
            ...(body ? { body: JSON.stringify(body) } : {}),
            signal: AbortSignal.timeout(15000),
        });
        assert.equal(
            response.status,
            status,
            `${method} ${path}: ${await response.clone().text()}`,
        );
        return response.json();
    };
    const create = (f, manifest, key = randomUUID()) =>
        send(
            f.ownerHeaders,
            "/api/contribution",
            "POST",
            { courseCode: f.code, parentFolder: f.folder.id, manifest },
            201,
            { "idempotency-key": key },
        );
    const receive = async (
        f,
        op,
        index,
        bytes,
        status = 202,
        filename = op.entries[index].name,
    ) => {
        const body = new FormData();
        body.append("file", new Blob([bytes]), filename);
        const response = await fetch(origin + "/api/contribution/upload", {
            method: "POST",
            headers: {
                ...f.ownerHeaders,
                "contribution-id": op.id,
                "upload-file-id": op.entries[index].id,
            },
            body,
        });
        assert.equal(response.status, status, await response.clone().text());
        return response.json();
    };
    const run = async (id) => {
        await OperationModel.updateOne({ _id: id }, { $set: { nextRunAt: new Date(0) } });
        assert.equal(await processOperation(id), true);
        return OperationModel.findById(id);
    };
    t.beforeEach((sub) => {
        sub.mock.method(storage, "findUpload", async () => null);
        sub.mock.method(storage, "cancelSession", async () => {});
        sub.mock.method(storage, "remove", async () => {});
        sub.mock.method(getImageKit().files, "delete", async () => {});
    });

    await t.test(
        "manifest creation is idempotent; forged ownership and actual byte/name mismatches cannot stage a file",
        async () => {
            const f = await fixture(),
                key = randomUUID(),
                manifest = [{ name: "notes.pdf", size: 5 }];
            const [op, replay] = await Promise.all([
                create(f, manifest, key),
                create(f, manifest, key),
            ]);
            assert.equal(op.id, replay.id);
            assert.equal(await Contribution.countDocuments({ contributionId: op.id }), 1);
            await send(
                f.ownerHeaders,
                "/api/contribution",
                "POST",
                {
                    courseCode: f.code,
                    parentFolder: f.folder.id,
                    manifest: [{ name: "other.pdf", size: 5 }],
                },
                409,
                { "idempotency-key": key },
            );
            await receive(f, op, 0, "four", 400);
            await receive(f, op, 0, "12345", 400, "renamed.pdf");
            const other = { ...f, ownerHeaders: f.managerHeaders };
            await receive(other, op, 0, "12345", 404);
            await receive(
                f,
                { ...op, entries: [{ id: randomUUID(), name: "notes.pdf" }] },
                0,
                "12345",
                404,
            );
            const record = await OperationModel.findById(op.id);
            assert.equal(record.receivingCount, 0);
            assert.equal(await StorageLease.countDocuments({ _id: /^receive:/ }), 0);
            await assert.rejects(fs.access(temporaryPath(record.entries[0].temporaryName)), {
                code: "ENOENT",
            });
            assert.equal(await FileModel.countDocuments({ uploadOperation: op.id }), 0);
        },
    );

    await t.test(
        "partial uploads preserve successes, retry only failed bytes and enforce unchanged retry content",
        async (sub) => {
            const f = await fixture(),
                op = await create(f, [
                    { name: "one~notes.pdf", size: 5 },
                    { name: "two.pdf", size: 5 },
                ]);
            const calls = [];
            sub.mock.method(storage, "upload", async (args) => {
                const text = await fs.readFile(args.filename, "utf8");
                calls.push(text);
                if (text === "22222" && calls.filter((value) => value === text).length === 1)
                    throw new StorageError(503);
                return { id: "partial-" + text };
            });
            await receive(f, op, 0, "11111");
            await receive(f, op, 1, "22222");
            let result = await run(op.id);
            assert.equal(result.status, "partial");
            assert.deepEqual(
                result.entries.map((entry) => entry.state),
                ["completed", "failed"],
            );
            for (const entry of result.entries)
                await assert.rejects(fs.access(temporaryPath(entry.temporaryName)), {
                    code: "ENOENT",
                });
            const own = await send(f.ownerHeaders, "/api/operations/" + op.id);
            assert.doesNotMatch(
                JSON.stringify(own),
                /sessionUrl|providerId|temporaryName|remoteName|sha256|leaseToken/,
            );
            await send(f.ownerHeaders, `/api/operations/${op.id}/retry`, "POST", {}, 202);
            await receive(f, op, 1, "wrong", 409);
            await receive(f, op, 1, "22222");
            result = await run(op.id);
            assert.equal(result.status, "completed");
            assert.deepEqual([...calls].sort(), ["11111", "22222", "22222"]);
            assert.equal(await FileModel.countDocuments({ uploadOperation: op.id }), 2);
            const first = result.entries[0];
            const renamed = await send(
                f.managerHeaders,
                `/api/files/rename/${first.fileId}`,
                "PUT",
                { courseCode: f.code, newName: "Renamed notes" },
            );
            assert.equal(renamed.file.name, "Renamed notes.pdf");
            assert.equal((await FileModel.findById(first.fileId)).fileId, first.providerId);
        },
    );

    await t.test(
        "cancellation after storage completion removes unpublished bytes and keeps earlier successful files",
        async (sub) => {
            const f = await fixture(),
                op = await create(f, [
                    { name: "keep.pdf", size: 4 },
                    { name: "cancel.pdf", size: 4 },
                ]);
            const deleted = [],
                sessions = [];
            let uploads = 0;
            sub.mock.method(storage, "upload", async (args) => {
                if (++uploads === 1) return { id: "keep-file" };
                await args.onSession("https://tenant.sharepoint.com/upload-session");
                await send(f.ownerHeaders, `/api/operations/${op.id}/cancel`, "POST", {}, 202);
                return { id: "unpublished-file" };
            });
            sub.mock.method(storage, "remove", async (id) => {
                deleted.push(id);
            });
            sub.mock.method(storage, "cancelSession", async (url) => {
                sessions.push(url);
            });
            await receive(f, op, 0, "keep");
            assert.equal((await run(op.id)).status, "awaiting");
            await receive(f, op, 1, "stop");
            const result = await run(op.id);
            assert.equal(result.status, "cancelled");
            assert.deepEqual(
                result.entries.map((entry) => entry.state),
                ["completed", "cancelled"],
            );
            assert.deepEqual(deleted, ["unpublished-file"]);
            assert.equal(sessions.length, 1);
            assert.equal(await FileModel.countDocuments({ uploadOperation: op.id }), 1);
            await receive(f, op, 1, "stop", 409);
            await send(f.managerHeaders, `/api/operations/${op.id}/cancel`, "POST", {}, 403);
        },
    );

    await t.test(
        "an expired worker resumes publication from saved storage IDs without uploading again",
        async (sub) => {
            const f = await fixture(),
                op = await create(f, [{ name: "restart.pdf", size: 5 }]);
            await receive(f, op, 0, "12345");
            const record = await OperationModel.findById(op.id),
                entry = record.entries[0];
            await OperationModel.updateOne(
                { _id: op.id },
                {
                    $set: {
                        status: "running",
                        leaseToken: "stopped-process",
                        leaseUntil: new Date(0),
                        "entries.0.state": "publishing",
                        "entries.0.providerId": "already-uploaded",
                    },
                },
            );
            await FileModel.create({
                _id: entry.fileId,
                name: entry.name,
                fileId: "already-uploaded",
                size: "5",
                uploadOperation: op.id,
                resourceState: "uploading",
            });
            await FolderModel.updateOne(
                { _id: f.folder.id },
                { $addToSet: { children: entry.fileId } },
            );
            await acquireCourseLocks(record.courses, op.id, { durable: true });
            await send(f.ownerHeaders, `/api/files/link/${entry.fileId}`, "GET", undefined, 404);
            sub.mock.method(storage, "upload", () =>
                assert.fail("Publication recovery must reuse the journaled provider ID"),
            );
            assert.equal((await run(op.id)).status, "completed");
            assert.equal((await FileModel.findById(entry.fileId)).resourceState, "ready");
            assert.equal(await CourseLock.countDocuments({ owner: op.id }), 0);
            await assert.rejects(fs.access(temporaryPath(entry.temporaryName)), { code: "ENOENT" });
        },
    );

    await t.test(
        "moderation rejection cancels unfinished contribution uploads and confirms every shared course",
        async (sub) => {
            const f = await fixture(),
                op = await create(f, [
                    { name: "reject.pdf", size: 5 },
                    { name: "waiting.pdf", size: 5 },
                ]);
            sub.mock.method(storage, "upload", async () => ({ id: "reject-upload" }));
            await receive(f, op, 0, "12345");
            assert.equal((await run(op.id)).status, "awaiting");
            const body = { contributionId: op.id, action: "reject", courseCode: f.code };
            await send(f.adminHeaders, "/api/admin/contribution/action", "POST", body, 409);
            const deletion = await send(
                f.adminHeaders,
                "/api/admin/contribution/action",
                "POST",
                { ...body, affectedCourses: [f.code, f.sharedCode] },
                202,
            );
            assert.equal((await OperationModel.findById(op.id)).cancelRequested, true);
            assert.equal((await run(deletion.operationId)).status, "completed");
            assert.equal((await run(op.id)).status, "cancelled");
            assert.equal(await FileModel.countDocuments({ uploadOperation: op.id }), 0);
            assert.equal(await Contribution.countDocuments({ contributionId: op.id }), 0);
        },
    );

    await t.test(
        "a lost worker lease cannot publish or remove a successor's staged file",
        async (sub) => {
            const f = await fixture(),
                op = await create(f, [{ name: "lease.pdf", size: 5 }]);
            await receive(f, op, 0, "12345");
            let calls = 0;
            sub.mock.method(storage, "upload", async () => {
                if (++calls === 1)
                    await OperationModel.updateOne(
                        { _id: op.id },
                        { $set: { leaseToken: "replacement-worker", leaseUntil: new Date(0) } },
                    );
                return { id: "lease-upload" };
            });
            const interrupted = await run(op.id);
            assert.equal(interrupted.status, "running");
            assert.equal(await FileModel.countDocuments({ uploadOperation: op.id }), 0);
            await fs.access(temporaryPath(interrupted.entries[0].temporaryName));
            assert.equal((await run(op.id)).status, "completed");
            assert.equal(await FileModel.countDocuments({ uploadOperation: op.id }), 1);
        },
    );

    await t.test(
        "a removed upload destination schedules recoverable cleanup of unpublished provider files",
        async (sub) => {
            const f = await fixture(),
                op = await create(f, [{ name: "removed-folder.pdf", size: 5 }]);
            await receive(f, op, 0, "12345");
            sub.mock.method(storage, "upload", async () => {
                await FolderModel.deleteOne({ _id: f.folder.id });
                return { id: "unpublished-after-removal" };
            });
            let attempts = 0;
            sub.mock.method(storage, "remove", async (id) => {
                assert.equal(id, "unpublished-after-removal");
                if (++attempts === 1) throw new StorageError(503);
            });
            const interrupted = await run(op.id);
            assert.equal(interrupted.status, "queued");
            assert.equal(interrupted.entries[0].state, "cleanup");
            assert.equal(interrupted.entries[0].providerId, "unpublished-after-removal");
            const recovered = await run(op.id);
            assert.equal(recovered.status, "failed");
            assert.equal(recovered.entries[0].providerId, null);
            assert.equal(attempts, 2);
            assert.equal(await FileModel.countDocuments({ uploadOperation: op.id }), 0);
            assert.equal(await Contribution.countDocuments({ contributionId: op.id }), 0);
        },
    );

    await t.test(
        "deletion journals identifiers before side effects, hides content and resumes after provider failure without repeating completed steps",
        async (sub) => {
            const f = await fixture();
            const file = await FileModel.create({
                name: "shared.pdf",
                fileId: "journal-shared-file",
                size: "5",
                isVerified: true,
                thumbnail: { fileId: "journal-thumbnail" },
            });
            await FolderModel.updateOne(
                { _id: f.folder.id },
                { $addToSet: { children: file._id } },
            );
            const path = `/api/files/unverify/${file.id}`;
            await send(f.managerHeaders, path, "DELETE", { courseCode: f.code }, 409);
            const body = { courseCode: f.code, affectedCourses: [f.code, f.sharedCode] };
            const [accepted, duplicate] = await Promise.all([
                send(f.managerHeaders, path, "DELETE", body, 202),
                send(f.managerHeaders, path, "DELETE", body, 202),
            ]);
            assert.equal(accepted.operationId, duplicate.operationId);
            const id = accepted.operationId;
            assert.equal((await FileModel.findById(file.id)).deletingOperation, id);
            await send(f.ownerHeaders, `/api/files/link/${file.id}`, "GET", undefined, 404);
            await send(
                f.managerHeaders,
                "/api/folder/rename",
                "POST",
                { folderId: f.folder.id, courseCode: f.code, newName: "blocked" },
                409,
            );
            let removed = 0,
                thumbnails = 0;
            sub.mock.method(storage, "remove", async (providerId) => {
                const journal = await OperationModel.findById(id);
                assert.deepEqual(
                    journal.plan.files.map((entry) => [
                        entry.id,
                        entry.providerId,
                        entry.thumbnailId,
                    ]),
                    [[file.id, file.fileId, "journal-thumbnail"]],
                );
                assert.equal(providerId, file.fileId);
                removed++;
            });
            sub.mock.method(getImageKit().files, "delete", async () => {
                thumbnails++;
                throw new StorageError(503);
            });
            await OperationModel.updateOne({ _id: id }, { $set: { attempts: 4 } });
            assert.equal((await run(id)).status, "failed");
            assert.ok(await FileModel.findById(file.id));
            assert.equal(await CourseLock.countDocuments({ owner: id }), 2);
            await send(f.ownerHeaders, `/api/operations/${id}`, "GET", undefined, 404);
            await send(f.managerHeaders, `/api/operations/${id}/retry`, "POST", {}, 403);
            await send(f.adminHeaders, `/api/operations/${id}/retry`, "POST", {}, 202);
            sub.mock.method(getImageKit().files, "delete", async () => {
                thumbnails++;
                throw Object.assign(new Error("already absent"), { status: 404 });
            });
            await OperationModel.updateOne(
                { _id: id },
                { $set: { status: "running", leaseToken: "crashed", leaseUntil: new Date(0) } },
            );
            assert.equal((await run(id)).status, "completed");
            assert.equal(removed, 1);
            assert.equal(thumbnails, 2);
            assert.equal(await FileModel.findById(file.id), null);
            assert.equal(await CourseLock.countDocuments({ owner: id }), 0);
            assert.equal((await send(f.managerHeaders, path, "DELETE", body, 202)).operationId, id);
            await acquireCourseLocks([f.code], id, { durable: true });
            await recoverLocks();
            assert.equal(await CourseLock.countDocuments({ owner: id }), 0);
        },
    );

    await t.test(
        "shared year removal only unlinks; deleting the remaining course cleans unique content and protects the provider root",
        async (sub) => {
            const f = await fixture();
            const file = await FileModel.create({
                name: "unique.pdf",
                fileId: "test-storage-root",
                size: "1",
                isVerified: true,
            });
            await FolderModel.updateOne(
                { _id: f.folder.id },
                { $addToSet: { children: file._id } },
            );
            await send(
                f.managerHeaders,
                `/api/files/unverify/${file.id}`,
                "DELETE",
                { courseCode: f.code, affectedCourses: [f.code, f.sharedCode] },
                403,
            );
            assert.equal((await FileModel.findById(file.id)).deletingOperation, undefined);
            await FileModel.updateOne({ _id: file.id }, { $set: { fileId: "unique-item" } });
            const unlinked = await send(
                f.managerHeaders,
                "/api/year/delete",
                "DELETE",
                { folderId: f.root.id, courseCode: f.code },
                202,
            );
            assert.equal((await run(unlinked.operationId)).status, "completed");
            assert.deepEqual((await FolderModel.findById(f.folder.id)).courses, [f.sharedCode]);
            assert.ok(await FileModel.findById(file.id));
            assert.equal(
                (
                    await send(
                        f.managerHeaders,
                        "/api/year/delete",
                        "DELETE",
                        { folderId: f.root.id, courseCode: f.code },
                        202,
                    )
                ).operationId,
                unlinked.operationId,
            );
            const deleted = [];
            sub.mock.method(storage, "remove", async (id) => {
                deleted.push(id);
            });
            const removed = await send(
                f.adminHeaders,
                `/api/admin/course/${f.sharedCode}/delete`,
                "DELETE",
                {},
                202,
            );
            assert.equal((await run(removed.operationId)).status, "completed");
            assert.deepEqual(deleted, ["unique-item"]);
            assert.equal(await FolderModel.findById(f.root.id), null);
            assert.equal(await FileModel.findById(file.id), null);
            assert.ok(await Course.findOne({ code: f.code }));
        },
    );

    await t.test(
        "stale multipart reservations and orphaned locks release bounded staging capacity on restart",
        async () => {
            const f = await fixture(),
                op = await create(f, [{ name: "stalled.pdf", size: 5 }]);
            const req = {
                user: f.owner,
                headers: { "contribution-id": op.id, "upload-file-id": op.entries[0].id },
            };
            const reservation = await reserveUpload(req);
            await fs.mkdir(uploadDirectory(), { recursive: true });
            await fs.writeFile(temporaryPath(reservation.temporaryName), "part");
            await OperationModel.updateOne(
                { _id: op.id },
                { $set: { "entries.0.receiveUntil": new Date(0) } },
            );
            await recoverReceiving();
            assert.equal((await OperationModel.findById(op.id)).entries[0].state, "failed");
            assert.equal(await StorageLease.countDocuments({ owner: reservation.token }), 0);
            await assert.rejects(fs.access(temporaryPath(reservation.temporaryName)), {
                code: "ENOENT",
            });
            const reservations = [];
            for (let index = 0; index < 8; index++) {
                const next = await create(f, [{ name: "bounded.pdf", size: 5 }]);
                reservations.push(
                    await reserveUpload({
                        user: f.owner,
                        headers: {
                            "contribution-id": next.id,
                            "upload-file-id": next.entries[0].id,
                        },
                    }),
                );
            }
            try {
                await assert.rejects(reserveUpload(req), { code: "STORAGE_BUSY" });
            } finally {
                for (const item of reservations) await receiveFailed(item);
            }
            assert.equal(await StorageLease.countDocuments({ _id: /^receive:/ }), 0);
        },
    );

    await t.test(
        "the production multipart boundary rejects actual bytes above 100 MiB and cleans its temporary file",
        async () => {
            const f = await fixture(),
                op = await create(f, [{ name: "oversize.pdf", size: uploadLimits.fileBytes }]);
            const boundary = "coursehub-byte-limit",
                start = Buffer.from(
                    `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="oversize.pdf"\r\nContent-Type: application/pdf\r\n\r\n`,
                ),
                end = Buffer.from(`\r\n--${boundary}--\r\n`);
            const size = uploadLimits.fileBytes + 1;
            const request = http.request(origin + "/api/contribution/upload", {
                method: "POST",
                headers: {
                    ...f.ownerHeaders,
                    "contribution-id": op.id,
                    "upload-file-id": op.entries[0].id,
                    "content-type": `multipart/form-data; boundary=${boundary}`,
                    "content-length": start.length + size + end.length,
                },
            });
            const responsePromise = once(request, "response");
            request.write(start);
            const chunk = Buffer.alloc(1024 * 1024, 120);
            for (let sent = 0; sent < size; ) {
                const bytes = chunk.subarray(0, Math.min(chunk.length, size - sent));
                if (!request.write(bytes)) await once(request, "drain");
                sent += bytes.length;
            }
            request.end(end);
            const [response] = await responsePromise;
            assert.equal(response.statusCode, 413);
            for await (const _ of response) {
                /* Drain the safe error response. */
            }
            const record = await OperationModel.findById(op.id);
            assert.equal(record.entries[0].state, "failed");
            await assert.rejects(fs.access(temporaryPath(record.entries[0].temporaryName)), {
                code: "ENOENT",
            });
            assert.equal(await StorageLease.countDocuments({ _id: /^receive:/ }), 0);
        },
    );
}
