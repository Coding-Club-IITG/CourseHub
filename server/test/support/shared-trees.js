import assert from "node:assert/strict";
import { Types } from "mongoose";
import Course, { FolderModel, FileModel } from "../../modules/course/course.model.js";
import User from "../../modules/user/user.model.js";
import Admin from "../../modules/admin/admin.model.js";
import BR from "../../modules/br/br.model.js";
import CourseAllotment from "../../modules/course/courseAllotment.model.js";
import { OperationModel, CourseLock } from "../../modules/operation/operation.model.js";
import { processOperation } from "../../services/operationWorker.js";
import { academicPeriod } from "../../services/authorization.js";
import { sessionHeaders } from "../fixtures/sessions.js";
import { student } from "../fixtures/library.js";
import { storage } from "../../services/storage.js";
import { bootstrapCourseFolders } from "../../modules/course/course.service.js";

export async function exerciseSharedTrees(t, origin) {
    let serial = 0;
    const admin = await Admin.findOne(),
        adminHeaders = await sessionHeaders(admin.id, "admin");
    const send = async (url, method = "GET", body, status = 200, headers = adminHeaders) => {
        const response = await fetch(origin + url, {
            method,
            headers: { ...headers, "content-type": "application/json" },
            body: body === undefined ? undefined : JSON.stringify(body),
        });
        const data = await response.json();
        assert.equal(response.status, status, JSON.stringify(data));
        return data;
    };
    const run = async (id) => {
        await OperationModel.updateOne({ _id: id }, { $set: { nextRunAt: new Date(0) } });
        assert.equal(await processOperation(id), true);
        return send(`/api/operations/${id}`);
    };
    const make = async () => {
        const n = ++serial,
            sourceCode = `TREE${n}01`,
            targetCode = `TREE${n}02`;
        const leaf = await FolderModel.create({
            name: "Notes",
            courses: [sourceCode],
            childType: "File",
            children: [],
        });
        const branch = await FolderModel.create({
            name: "Nested",
            courses: [sourceCode],
            childType: "Folder",
            children: [leaf._id],
        });
        const year = await FolderModel.create({
            name: "2026",
            courses: [sourceCode],
            childType: "Folder",
            children: [branch._id],
        });
        const source = await Course.create({
            code: sourceCode,
            name: "Source",
            children: [year._id],
        });
        const target = await Course.create({ code: targetCode, name: "Target", children: [] });
        const { _id, ...base } = student;
        const manager = await User.create({
            ...base,
            rollNumber: 296000000 + n,
            email: `tree${n}@example.test`,
        });
        await BR.create({ email: manager.email });
        await CourseAllotment.create({
            rollNumber: manager.rollNumber,
            ...academicPeriod(),
            courses: [sourceCode],
        });
        return {
            sourceCode,
            targetCode,
            source,
            target,
            year,
            branch,
            leaf,
            manager,
            headers: await sessionHeaders(manager.id),
        };
    };
    const link = (f) =>
        send(`/api/admin/course/${f.targetCode}/link`, "POST", { legacyCode: f.sourceCode }, 202);
    const addFile = async (folder, name) => {
        const file = await FileModel.create({
            name,
            fileId: `tree-${folder.id}-${name}`,
            size: "5",
            isVerified: true,
        });
        await FolderModel.updateOne({ _id: folder._id }, { $addToSet: { children: file._id } });
        return file;
    };

    await t.test(
        "nested shared links preserve IDs, deduplicate concurrent requests and inherit new descendants",
        async () => {
            const f = await make(),
                file = await addFile(f.leaf, "notes.pdf");
            const [first, duplicate] = await Promise.all([link(f), link(f)]);
            assert.equal(first.operationId, duplicate.operationId);
            assert.deepEqual((await Course.findById(f.target.id)).children, []);
            assert.equal((await run(first.operationId)).status, "completed");
            for (const item of [f.year, f.branch, f.leaf])
                assert.deepEqual((await FolderModel.findById(item.id)).courses.sort(), [
                    f.sourceCode,
                    f.targetCode,
                ]);
            const target = await send(`/api/course/${f.targetCode}`);
            assert.equal(target.children[0]._id, f.year.id);
            assert.equal(target.children[0].children[0].children[0].children[0]._id, file.id);
            const created = await send(
                "/api/folder/create",
                "POST",
                {
                    name: "New shared notes",
                    course: f.sourceCode,
                    parentFolder: f.branch.id,
                    childType: "File",
                },
                200,
                f.headers,
            );
            assert.deepEqual(created.affectedCourses, [f.sourceCode, f.targetCode]);
            const count = await FolderModel.countDocuments();
            const repeated = await run((await link(f)).operationId);
            assert.equal(repeated.linking.alreadyLinked.length, 1);
            assert.equal(repeated.linking.linked.length, 0);
            assert.equal(await FolderModel.countDocuments(), count);
            assert.equal(await FileModel.countDocuments({ _id: file.id }), 1);
        },
    );

    await t.test(
        "populated duplicate target years remain intact and conflicts are returned",
        async () => {
            const f = await make();
            const years = await FolderModel.create(
                [0, 1, 2].map((i) => ({
                    name: i ? "2026" : " 2026 ",
                    childType: "File",
                    courses: [f.targetCode],
                    children: [],
                })),
            );
            const files = await Promise.all(
                years.slice(1).map((year, i) => addFile(year, `duplicate${i}.pdf`)),
            );
            await Course.updateOne(
                { _id: f.target.id },
                { $set: { children: years.map((y) => y._id) } },
            );
            const result = await run((await link(f)).operationId);
            assert.equal(result.linking.conflicts.length, 1);
            assert.equal(result.linking.linked.length, 0);
            assert.deepEqual(
                (await Course.findById(f.target.id)).children.map(String),
                years.map((y) => y.id),
            );
            assert.equal(
                await FileModel.countDocuments({ _id: { $in: files.map((file) => file.id) } }),
                2,
            );
            assert.equal(
                await FolderModel.countDocuments({ _id: { $in: years.map((y) => y.id) } }),
                3,
            );
        },
    );

    await t.test(
        "empty replacements are journaled before writes and recover after interruption with locks held",
        async (sub) => {
            const f = await make(),
                empty = await FolderModel.create({
                    name: "2026",
                    childType: "File",
                    courses: [f.targetCode.toLowerCase(), ` ${f.targetCode} `],
                    children: [],
                });
            await Course.updateOne({ _id: f.target.id }, { $set: { children: [empty._id] } });
            const { operationId } = await link(f);
            const saved = await OperationModel.findById(operationId);
            assert.ok(saved.plan.removeMembership.includes(empty.id));
            assert.equal(await CourseLock.countDocuments({ owner: operationId }), 3);
            await send(
                "/api/folder/create",
                "POST",
                {
                    name: "Concurrent",
                    course: f.sourceCode,
                    parentFolder: f.branch.id,
                    childType: "File",
                },
                409,
                f.headers,
            );
            const original = Course.updateOne.bind(Course);
            let fail = true;
            sub.mock.method(Course, "updateOne", async (filter, update, options) => {
                if (update.$set?.children && fail) {
                    fail = false;
                    throw new Error("simulated restart before root publication");
                }
                return original(filter, update, options);
            });
            await OperationModel.updateOne({ _id: operationId }, { $set: { attempts: 5 } });
            const interrupted = await run(operationId);
            assert.equal(interrupted.status, "failed");
            assert.ok(
                (await OperationModel.findById(operationId)).completedSteps.includes("memberships"),
            );
            assert.deepEqual((await Course.findById(f.target.id)).children.map(String), [empty.id]);
            assert.equal(await CourseLock.countDocuments({ owner: operationId }), 3);
            await send(`/api/operations/${operationId}/retry`, "POST", {}, 403, f.headers);
            await send(`/api/operations/${operationId}/retry`, "POST", {}, 202);
            const completed = await run(operationId);
            assert.equal(completed.status, "completed");
            assert.equal(completed.linking.replaced[0].id, empty.id);
            assert.deepEqual((await Course.findById(f.target.id)).children.map(String), [
                f.year.id,
            ]);
            assert.deepEqual((await FolderModel.findById(empty.id)).courses, []);
            assert.equal(await CourseLock.countDocuments({ owner: operationId }), 0);
        },
    );

    await t.test(
        "adding a descendant beyond the depth boundary fails before any folders are created",
        async () => {
            const f = await make();
            await FolderModel.updateOne({ _id: f.leaf.id }, { $set: { childType: "Folder" } });
            let root = f.year;
            for (let i = 0; i < 61; i++)
                root = await FolderModel.create({
                    name: `Depth ${i}`,
                    courses: [f.sourceCode],
                    childType: "Folder",
                    children: [root._id],
                });
            await Course.updateOne({ _id: f.source.id }, { $set: { children: [root._id] } });
            await send(`/api/course/${f.sourceCode}`);
            const count = await FolderModel.countDocuments();
            const rejected = await send(
                "/api/folder/create",
                "POST",
                {
                    name: "Too deep",
                    childType: "File",
                    course: f.sourceCode,
                    parentFolder: f.leaf.id,
                },
                409,
                f.headers,
            );
            assert.equal(rejected.code, "TREE_DEPTH_EXCEEDED");
            assert.equal(await FolderModel.countDocuments(), count);
            assert.deepEqual((await FolderModel.findById(f.leaf.id)).children, []);
        },
    );

    await t.test(
        "an explicit administrator link can create a missing target once while preserving source IDs",
        async () => {
            const f = await make(),
                targetCode = `${f.targetCode}NEW`;
            await send(`/api/course/${targetCode}`, "GET", undefined, 404);
            const accepted = await send(
                `/api/admin/course/${targetCode}/link`,
                "POST",
                { legacyCode: f.sourceCode },
                202,
            );
            assert.equal(await Course.exists({ code: targetCode }), null);
            assert.equal((await run(accepted.operationId)).status, "completed");
            const course = await send(`/api/course/${targetCode}`);
            assert.equal(course.children[0]._id, f.year.id);
            const again = await send(
                `/api/admin/course/${targetCode}/link`,
                "POST",
                { legacyCode: f.sourceCode },
                202,
            );
            await run(again.operationId);
            assert.equal(await Course.countDocuments({ code: targetCode }), 1);
            assert.equal((await send(`/api/course/${targetCode}`))._id, course._id);
        },
    );

    await t.test(
        "removing a shared branch unlinks only that course and deletes only its unique descendants",
        async (sub) => {
            const f = await make();
            await run((await link(f)).operationId);
            const sharedFile = await addFile(f.leaf, "shared.pdf");
            const unique = await FolderModel.create({
                name: "Source-only",
                courses: [f.sourceCode],
                childType: "File",
                children: [],
            });
            const uniqueFile = await addFile(unique, "unique.pdf");
            await FolderModel.updateOne(
                { _id: f.branch.id },
                { $addToSet: { children: unique._id } },
            );
            const removed = [];
            sub.mock.method(storage, "remove", async (id) => removed.push(id));
            const accepted = await send(
                "/api/folder/delete",
                "DELETE",
                {
                    folderId: f.branch.id,
                    courseCode: f.sourceCode,
                    children: [{ _id: sharedFile.id }],
                },
                202,
                f.headers,
            );
            assert.equal((await run(accepted.operationId)).status, "completed");
            assert.deepEqual(removed, [uniqueFile.fileId]);
            assert.equal(await FolderModel.exists({ _id: unique.id }), null);
            assert.ok(await FileModel.exists({ _id: sharedFile.id }));
            const source = await send(`/api/course/${f.sourceCode}`),
                target = await send(`/api/course/${f.targetCode}`);
            assert.equal(source.children[0].children.length, 0);
            assert.equal(source.children[0].totalFileCount, 0);
            assert.equal(target.children[0].totalFileCount, 1);
            assert.equal(target.children[0].children[0]._id, f.branch.id);
            await send(
                `/api/folder/content/${f.leaf.id}?courseCode=${f.sourceCode}`,
                "GET",
                undefined,
                404,
                f.headers,
            );
            const repeated = await run((await link(f)).operationId);
            assert.equal(repeated.linking.alreadyLinked.length, 1);
            assert.equal(
                (await send(`/api/course/${f.sourceCode}`)).children[0].children.length,
                0,
            );
            const removal = await send(
                "/api/year/delete",
                "DELETE",
                { folderId: f.year.id, courseCode: f.sourceCode },
                202,
                f.headers,
            );
            await run(removal.operationId);
            assert.deepEqual((await send(`/api/course/${f.sourceCode}`)).children, []);
            assert.equal((await send(`/api/course/${f.targetCode}`)).children[0].totalFileCount, 1);
        },
    );

    await t.test(
        "malformed referenced trees fail before any linking or deletion side effects",
        async () => {
            for (const kind of ["cycle", "folder", "file", "depth"]) {
                const f = await make();
                if (kind === "cycle")
                    await FolderModel.updateOne(
                        { _id: f.branch.id },
                        { $push: { children: f.year._id } },
                    );
                if (kind === "folder")
                    await FolderModel.updateOne(
                        { _id: f.branch.id },
                        { $push: { children: new Types.ObjectId() } },
                    );
                if (kind === "file")
                    await FolderModel.updateOne(
                        { _id: f.leaf.id },
                        { $push: { children: new Types.ObjectId() } },
                    );
                if (kind === "depth") {
                    let child = f.year;
                    for (let i = 0; i < 64; i++)
                        child = await FolderModel.create({
                            name: `Depth ${i}`,
                            courses: [f.sourceCode],
                            childType: "Folder",
                            children: [child._id],
                        });
                    await Course.updateOne(
                        { _id: f.source.id },
                        { $set: { children: [child._id] } },
                    );
                }
                const before = await OperationModel.countDocuments();
                const broken = await send(`/api/course/${f.sourceCode}`, "GET", undefined, 409);
                assert.match(broken.code, /^TREE_/);
                await send(
                    `/api/admin/course/${f.targetCode}/link`,
                    "POST",
                    { legacyCode: f.sourceCode },
                    409,
                );
                await send(
                    "/api/year/delete",
                    "DELETE",
                    { folderId: f.year.id, courseCode: f.sourceCode },
                    409,
                    f.headers,
                );
                assert.equal(await OperationModel.countDocuments(), before);
                assert.deepEqual((await send(`/api/course/${f.targetCode}`)).children, []);
            }
        },
    );

    await t.test(
        "linking requires an administrator and reports bulk jobs without claiming early completion",
        async () => {
            const f = await make();
            await send(
                `/api/admin/course/${f.targetCode}/link`,
                "POST",
                { legacyCode: f.sourceCode },
                403,
                f.headers,
            );
            await send(
                `/api/admin/course/${f.sourceCode}/link`,
                "POST",
                { legacyCode: f.sourceCode },
                400,
            );
            const body = new FormData();
            body.append(
                "file",
                new Blob([`${f.sourceCode},${f.targetCode}\nMISSINGTREE,NEWTREE\n`]),
                "links.csv",
            );
            const response = await fetch(origin + "/api/admin/courses/bulk-link", {
                method: "POST",
                headers: adminHeaders,
                body,
            });
            assert.equal(response.status, 202);
            const { summary } = await response.json();
            assert.equal(summary.scheduled, 1);
            assert.equal(summary.failed, 1);
            assert.equal(summary.success, undefined);
            assert.deepEqual((await Course.findById(f.target.id)).children, []);
            assert.equal((await run(summary.operations[0].operationId)).status, "completed");
        },
    );
    await t.test(
        "year creation and repeated bootstrapping preserve default folders and existing IDs",
        async () => {
            const f = await make();
            const year = await send(
                "/api/year",
                "POST",
                { name: "2020", course: f.sourceCode },
                200,
                f.headers,
            );
            assert.deepEqual(
                year.children.map((folder) => folder.name),
                ["Exams", "Lectures", "Assignments", "Resources"],
            );
            assert.deepEqual(
                year.children[0].children.map((folder) => folder.name),
                ["Quiz-1", "MidSem", "Quiz-2", "EndSem"],
            );
            assert.equal(year.totalFileCount, 0);
            await bootstrapCourseFolders(f.sourceCode);
            const first = (await Course.findById(f.source.id)).children.map(String);
            assert.ok(first.includes(year._id));
            assert.ok(first.includes(f.year.id));
            assert.deepEqual(await bootstrapCourseFolders(f.sourceCode), []);
            assert.deepEqual((await Course.findById(f.source.id)).children.map(String), first);
            assert.equal(await CourseLock.countDocuments({ _id: f.sourceCode }), 0);
        },
    );
    await t.test(
        "a missing journal target cannot be reported as completed and can resume after restoration",
        async () => {
            const f = await make(),
                target = await Course.findById(f.target.id).lean();
            const { operationId } = await link(f);
            await Course.deleteOne({ _id: target._id });
            const failed = await run(operationId);
            assert.equal(failed.status, "failed");
            assert.equal(failed.error.code, "LINK_TARGET_MISSING");
            assert.equal(await CourseLock.countDocuments({ owner: operationId }), 3);
            await Course.create(target);
            await send("/api/operations/" + operationId + "/retry", "POST", {}, 202);
            assert.equal((await run(operationId)).status, "completed");
            assert.equal((await send("/api/course/" + f.targetCode)).children[0]._id, f.year.id);
        },
    );
}
