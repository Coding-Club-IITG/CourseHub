import User from "../../modules/user/user.model.js";
import getImageKit from "../../services/imagekit.js";
import assert from "node:assert/strict";
import fs from "node:fs";
import { Readable } from "node:stream";
import { randomUUID } from "node:crypto";
import { storage } from "../../services/storage.js";
import { graph } from "../../services/graphClient.js";
import { OperationModel } from "../../modules/operation/operation.model.js";
import { processOperation } from "../../services/operationWorker.js";
import { sessionHeaders } from "../fixtures/sessions.js";
import Course, { FolderModel, FileModel } from "../../modules/course/course.model.js";
import BR from "../../modules/br/br.model.js";
import CourseAllotment from "../../modules/course/courseAllotment.model.js";
import Contribution from "../../modules/contribution/contribution.model.js";
import Admin from "../../modules/admin/admin.model.js";
import { upload } from "../../middleware/receiveUpload.js";
import { permissionFixtures } from "../fixtures/permissions.js";
import { academicPeriod } from "../../services/authorization.js";

export async function exerciseCoursePermissions(t, origin) {
    const f = await permissionFixtures();
    const admin = await Admin.findOne();
    f.actors.admin = {
        person: admin,
        headers: {
            ...(await sessionHeaders(admin.id, "admin")),
            "content-type": "application/json",
        },
    };
    const request = async (actor, method, route, body, status = 200) => {
        const response = await fetch(origin + route, {
            method,
            headers: { ...f.actors[actor].headers, "idempotency-key": randomUUID() },
            body: body === undefined ? undefined : JSON.stringify(body),
            signal: AbortSignal.timeout(5000),
        });
        assert.equal(
            response.status,
            status,
            `${actor} ${method} ${route}: ${await response.clone().text()}`,
        );
        return response;
    };
    const providerCalls = [];
    const deletedThumbnails = [];
    process.env.IMAGEKIT_PUBLIC_KEY = "fake-test-public-key";
    process.env.IMAGEKIT_PRIVATE_KEY = "fake-test-private-key";
    t.beforeEach((sub) => {
        sub.mock.method(getImageKit().files, "delete", async (id) => {
            deletedThumbnails.push(id);
        });
        sub.mock.method(storage, "withinRoot", async (id) => {
            providerCalls.push(id);
            return { id, file: {} };
        });
        sub.mock.method(storage, "content", async (id) => {
            providerCalls.push(id);
            return {
                data: Readable.from(["%PDF-1.4 permission document"]),
                headers: { "content-type": "application/pdf" },
            };
        });
        sub.mock.method(graph, "request", async (url) => {
            providerCalls.push(url);
            assert.equal(url, f.pending.thumbnail.url);
            return {
                status: 200,
                data: Readable.from(["image-fixture"]),
                headers: { "content-type": "image/webp" },
            };
        });
        sub.mock.method(storage, "remove", async (id) => {
            providerCalls.push("delete/" + id);
        });
    });

    await t.test(
        "favourites use live names and paths, preserve saved IDs and survive shared-course unlinking",
        async () => {
            const actor = f.actors.student.person;
            try {
                await request(
                    "student",
                    "POST",
                    "/api/user/favourites",
                    { id: f.approved.id, code: "AUTH201" },
                    404,
                );
                await request(
                    "student",
                    "POST",
                    "/api/user/favourites",
                    { id: f.approved.id, code: "AUTH101", name: "Forged", path: "Forged" },
                    400,
                );
                const added = await (
                    await request("student", "POST", "/api/user/favourites", {
                        id: f.approved.id,
                        code: "AUTH101",
                    })
                ).json();
                const savedId = added.favourites[0]._id;
                assert.equal(added.favourites[0].folderId, f.leaf.id);
                assert.equal(added.favourites[0].path, "2026 / Shared notes");
                await request("student", "POST", "/api/user/favourites", {
                    id: f.approved.id,
                    code: "AUTH101",
                });
                assert.equal((await User.findById(actor.id)).favourites.length, 1);
                await FileModel.updateOne(
                    { _id: f.approved.id },
                    { $set: { name: "Renamed.pdf" } },
                );
                await FolderModel.updateOne(
                    { _id: f.leaf.id },
                    { $set: { name: "Renamed notes" } },
                );
                await Course.updateOne({ code: "AUTH101" }, { $set: { children: [] } });
                const current = await (await request("student", "GET", "/api/user")).json();
                assert.equal(current.favourites[0]._id, savedId);
                assert.equal(current.favourites[0].name, "Renamed.pdf");
                assert.equal(current.favourites[0].path, "2026 / Renamed notes");
                assert.equal(current.favourites[0].code, "AUTH301");
                const link = await (
                    await request(
                        "student",
                        "GET",
                        "/api/files/link/" + f.approved.id + "?courseCode=AUTH301",
                    )
                ).json();
                assert.equal(link.folderId, f.leaf.id);
                assert.equal(link.path, current.favourites[0].path);
            } finally {
                await User.updateOne({ _id: actor.id }, { $set: { favourites: [] } });
                await FileModel.updateOne(
                    { _id: f.approved.id },
                    { $set: { name: f.approved.name } },
                );
                await FolderModel.updateOne({ _id: f.leaf.id }, { $set: { name: f.leaf.name } });
                await Course.updateOne({ code: "AUTH101" }, { $set: { children: [f.root._id] } });
            }
        },
    );
    await t.test(
        "inaccessible favourites expose no file metadata and remain removable only by their owner",
        async () => {
            try {
                await request(
                    "student",
                    "POST",
                    "/api/user/favourites",
                    { id: f.pending.id, code: "AUTH101" },
                    404,
                );
                const own = await (
                    await request("owner", "POST", "/api/user/favourites", {
                        id: f.pending.id,
                        code: "AUTH101",
                    })
                ).json();
                assert.equal(own.favourites[0].file.isVerified, false);
                const added = await (
                    await request("student", "POST", "/api/user/favourites", {
                        id: f.approved.id,
                        code: "AUTH101",
                    })
                ).json();
                const saved = added.favourites[0];
                await FileModel.updateOne({ _id: f.approved.id }, { $set: { isVerified: false } });
                const result = await (await request("student", "GET", "/api/user")).json();
                assert.deepEqual(result.favourites, [
                    { _id: saved._id, id: f.approved.id, available: false },
                ]);
                await request("student", "GET", "/api/files/link/" + f.approved.id, undefined, 404);
                await request("owner", "DELETE", "/api/user/favourites/" + saved._id);
                assert.equal(
                    (await User.findById(f.actors.student.person.id)).favourites.length,
                    1,
                );
                const removed = await (
                    await request("student", "DELETE", "/api/user/favourites/" + saved._id)
                ).json();
                assert.deepEqual(removed.favourites, []);
            } finally {
                await FileModel.updateOne({ _id: f.approved.id }, { $set: { isVerified: true } });
                await User.updateMany(
                    { _id: { $in: [f.actors.owner.person.id, f.actors.student.person.id] } },
                    { $set: { favourites: [] } },
                );
            }
        },
    );

    await t.test(
        "course revisions change for visible nested changes, while a hidden pending rename leaves a student's revision unchanged",
        async () => {
            const read = async (role) => (await request(role, "GET", "/api/course/AUTH101")).json();
            const before = await read("student");
            const owner = await read("owner");
            assert.match(before.revision, /^[a-f0-9]{64}$/);
            try {
                await FileModel.updateOne(
                    { _id: f.pending.id },
                    { $set: { name: "Private renamed.pdf" } },
                );
                assert.equal((await read("student")).revision, before.revision);
                assert.notEqual((await read("owner")).revision, owner.revision);
                await FileModel.updateOne(
                    { _id: f.approved.id },
                    { $set: { name: "Public renamed.pdf" } },
                );
                assert.notEqual((await read("student")).revision, before.revision);
            } finally {
                await FileModel.updateOne(
                    { _id: f.pending.id },
                    { $set: { name: f.pending.name } },
                );
                await FileModel.updateOne(
                    { _id: f.approved.id },
                    { $set: { name: f.approved.name } },
                );
            }
        },
    );

    for (const role of Object.keys(f.actors))
        await t.test(
            `${role}: pending visibility across trees, counts, metadata, content, thumbnails and archive inputs`,
            async () => {
                const seesPending = ["owner", "currentBR", "historicalBR", "admin"].includes(role);
                const canManage = ["currentBR", "historicalBR", "admin"].includes(role);
                const tree = await (await request(role, "GET", "/api/course/AUTH101")).json();
                const content = await (
                    await request(
                        role,
                        "GET",
                        `/api/folder/content/${f.leaf.id}?courseCode=AUTH101`,
                    )
                ).json();
                assert.equal(tree.capabilities.canManage, canManage);
                assert.equal(content.totalFileCount, seesPending ? 2 : 1);
                assert.equal(tree.children[0].totalFileCount, seesPending ? 2 : 1);
                assert.deepEqual(
                    content.children.map((file) => file._id).sort(),
                    [f.approved.id, ...(seesPending ? [f.pending.id] : [])].sort(),
                );
                assert.equal(JSON.stringify(tree).includes("provider.example.test"), false);
                assert.equal(JSON.stringify(tree).includes("private.webp"), false);
                assert.equal(JSON.stringify(tree).includes(f.pending.fileId), false);
                const all = await (await request(role, "GET", "/api/files/all")).json();
                assert.equal(
                    all.some((file) => file._id === f.pending.id),
                    seesPending,
                );
                for (const [method, path, body] of [
                    ["GET", `/api/files/link/${f.pending.id}`],
                    [
                        "POST",
                        "/api/files/download",
                        { fileId: f.pending.id, courseCode: "AUTH101" },
                    ],
                    ["GET", `/api/files/content/${f.pending.id}`],
                    ["GET", `/api/files/preview/${f.pending.id}`],
                    ["GET", `/api/files/thumbnail/${f.pending.id}`],
                    ["HEAD", `/api/files/content/${f.pending.id}`],
                    ["HEAD", `/api/files/thumbnail/${f.pending.id}`],
                ]) {
                    const before = providerCalls.length;
                    const response = await request(
                        role,
                        method,
                        path,
                        body,
                        seesPending ? 200 : 404,
                    );
                    await response.arrayBuffer();
                    if (!seesPending) assert.equal(providerCalls.length, before);
                }
                // Approved files remain available even outside registration.
                await request(role, "GET", `/api/files/link/${f.approved.id}`);
            },
        );
    await t.test(
        "BR status comes from the registry and registered permissions come from allotments",
        async () => {
            for (const role of Object.keys(f.actors).filter((r) => r !== "admin")) {
                const user = await (await request(role, "GET", "/api/user")).json();
                assert.equal(
                    user.isBR,
                    ["currentBR", "historicalBR", "unrelatedBR", "unallottedBR"].includes(role),
                );
                assert.equal(
                    user.capabilities.canManageCourses.includes("AUTH101"),
                    ["currentBR", "historicalBR"].includes(role),
                );
                assert.equal(user.capabilities.canManageCourses.includes("AUTH301"), false);
            }
            // A future allotment cannot give management access now.
            await CourseAllotment.create({
                rollNumber: f.actors.unallottedBR.person.rollNumber,
                ...academicPeriod(),
                year: academicPeriod().year + 1,
                courses: ["AUTH101"],
            });
            const user = await (await request("unallottedBR", "GET", "/api/user")).json();
            assert.deepEqual(user.capabilities.canManageCourses, []);
        },
    );
    await t.test(
        "ordinary, unrelated, revoked and unallotted actors cannot mutate course resources",
        async () => {
            const originalFile = JSON.stringify(await FileModel.findById(f.pending.id).lean());
            const originalFolder = JSON.stringify(await FolderModel.findById(f.leaf.id).lean());
            const mutations = [
                ["PUT", `/api/files/verify/${f.pending.id}`, { courseCode: "AUTH101" }],
                [
                    "DELETE",
                    `/api/files/unverify/${f.pending.id}`,
                    { courseCode: "AUTH101", oneDriveId: f.foreign.fileId },
                ],
                [
                    "PUT",
                    `/api/files/rename/${f.pending.id}`,
                    { courseCode: "AUTH101", newName: "forged" },
                ],
                [
                    "POST",
                    "/api/folder/create",
                    {
                        course: "AUTH101",
                        parentFolder: f.root.id,
                        name: "forged",
                        childType: "File",
                    },
                ],
                [
                    "POST",
                    "/api/folder/rename",
                    { courseCode: "AUTH101", folderId: f.leaf.id, newName: "forged" },
                ],
                ["DELETE", "/api/folder/delete", { courseCode: "AUTH101", folderId: f.leaf.id }],
                ["POST", "/api/year", { course: "AUTH101", name: "2030" }],
                ["DELETE", "/api/year/delete", { courseCode: "AUTH101", folderId: f.root.id }],
            ];
            const before = providerCalls.length;
            for (const role of ["owner", "student", "unrelatedBR", "revokedBR", "unallottedBR"])
                for (const [method, route, body] of mutations)
                    await request(role, method, route, body, 403);
            assert.equal(providerCalls.length, before);
            assert.equal(
                JSON.stringify(await FileModel.findById(f.pending.id).lean()),
                originalFile,
            );
            assert.equal(
                JSON.stringify(await FolderModel.findById(f.leaf.id).lean()),
                originalFolder,
            );
        },
    );
    await t.test(
        "forged resource IDs and foreign contexts fail before provider or database mutations",
        async () => {
            const before = providerCalls.length;
            for (const role of ["currentBR", "historicalBR", "admin"]) {
                await request(
                    role,
                    "PUT",
                    `/api/files/verify/${f.foreign.id}`,
                    { courseCode: "AUTH101" },
                    404,
                );
                await request(
                    role,
                    "PUT",
                    `/api/files/rename/${f.foreign.id}`,
                    { courseCode: "AUTH101", newName: "forged" },
                    404,
                );
                await request(
                    role,
                    "DELETE",
                    `/api/files/unverify/${f.foreign.id}`,
                    { courseCode: "AUTH101" },
                    404,
                );
                await request(
                    role,
                    "POST",
                    "/api/folder/create",
                    {
                        course: "AUTH101",
                        parentFolder: f.foreignLeaf.id,
                        name: "forged",
                        childType: "File",
                    },
                    404,
                );
                await request(
                    role,
                    "POST",
                    "/api/folder/rename",
                    { folderId: f.foreignLeaf.id, courseCode: "AUTH101", newName: "forged" },
                    404,
                );
                await request(
                    role,
                    "DELETE",
                    "/api/year/delete",
                    { folderId: f.foreignLeaf.id, courseCode: "AUTH101" },
                    404,
                );
                await request(
                    role,
                    "DELETE",
                    "/api/folder/delete",
                    { folderId: { $ne: null }, courseCode: "AUTH101" },
                    404,
                );
                await request(
                    role,
                    "GET",
                    `/api/folder/content/${f.foreignLeaf.id}?courseCode=AUTH101`,
                    undefined,
                    404,
                );
                await request(
                    role,
                    "POST",
                    "/api/files/download",
                    { fileId: { $ne: null }, courseCode: "AUTH101" },
                    404,
                );
            }
            assert.equal(providerCalls.length, before);
            assert.equal((await FileModel.findById(f.foreign.id)).isVerified, false);
        },
    );
    await t.test(
        "contribution identity and approval are generated by the server; Others grants no upload permission",
        async () => {
            const input = {
                parentFolder: f.leaf.id,
                courseCode: "AUTH101",
                description: "matrix upload",
                manifest: [{ name: "notes.pdf", size: 14 }],
            };
            for (const [key, value] of [
                ["uploadedBy", f.actors.student.person.id],
                ["approved", true],
                ["contributionId", f.contribution.contributionId],
            ])
                await request(
                    "owner",
                    "POST",
                    "/api/contribution",
                    { ...input, [key]: value },
                    400,
                );
            for (const role of [
                "owner",
                "student",
                "currentBR",
                "historicalBR",
                "revokedBR",
                "admin",
            ]) {
                const operation = await (
                    await request(role, "POST", "/api/contribution", input, 201)
                ).json();
                const data = await Contribution.findOne({ contributionId: operation.id });
                assert.equal(data.uploadedBy, f.actors[role].person.id);
                assert.match(data.contributionId, /^[0-9a-f-]{36}$/);
                assert.equal(data.approved, false);
                assert.equal(operation.entries[0].name, "notes.pdf");
            }
            for (const role of ["unrelatedBR", "unallottedBR"])
                await request(role, "POST", "/api/contribution", input, 403);
            await request(
                "currentBR",
                "POST",
                "/api/contribution",
                { ...input, courseCode: "AUTH301" },
                403,
            );
            await request(
                "owner",
                "POST",
                "/api/contribution",
                { ...input, parentFolder: f.foreignLeaf.id },
                404,
            );
            await request(
                "owner",
                "POST",
                "/api/contribution",
                { ...input, parentFolder: f.root.id },
                400,
            );
            // A historical student without BR status cannot contribute.
            await BR.deleteOne({ email: f.actors.historicalBR.person.email.toUpperCase() });
            await request("historicalBR", "POST", "/api/contribution", input, 403);
            await BR.create({ email: f.actors.historicalBR.person.email });
        },
    );
    await t.test("uploads must own a persisted contribution before multipart writes", async () => {
        const storage = t.mock.method(upload.storage, "_handleFile", () =>
            assert.fail("Forbidden multipart storage"),
        );
        for (const [role, id] of [
            ["student", f.contribution.contributionId],
            ["owner", "unknown-id"],
        ]) {
            const form = new FormData();
            form.append("file", new Blob(["forged"]), "notes.pdf");
            const response = await fetch(origin + "/api/contribution/upload", {
                method: "POST",
                headers: {
                    ...Object.fromEntries(
                        Object.entries(f.actors[role].headers).filter(
                            ([name]) => name !== "content-type",
                        ),
                    ),
                    "contribution-id": id,
                    username: "forged-uploader",
                },
                body: form,
            });
            assert.equal(response.status, 404);
        }
        assert.equal(storage.mock.callCount(), 0);
        storage.mock.restore();
    });
    await t.test(
        "moderation queues cannot be widened by editable course lists or foreign course filters",
        async () => {
            for (const role of ["currentBR", "historicalBR", "admin"]) {
                const data = await (await request(role, "POST", "/api/contribution/br", {})).json();
                assert.ok(
                    data.unverifiedContributions.some(
                        (c) => c.contributionId === f.contribution.contributionId,
                    ),
                );
            }
            const unrelated = await (
                await request("unrelatedBR", "POST", "/api/contribution/br", {})
            ).json();
            assert.deepEqual(unrelated.unverifiedContributions, []);
            await request(
                "unrelatedBR",
                "POST",
                "/api/contribution/br",
                { courses: [{ code: "AUTH101" }] },
                403,
            );
            for (const role of ["owner", "student", "revokedBR"])
                await request(role, "POST", "/api/contribution/br", {}, 403);
            const own = await (await request("owner", "GET", "/api/contribution")).json();
            assert.ok(own.some((c) => c.files.some((file) => file._id === f.pending.id)));
            const other = await (await request("student", "GET", "/api/contribution")).json();
            assert.ok(other.every((c) => c.files.every((file) => file._id !== f.pending.id)));
        },
    );
    await t.test("shared submissions appear in each authorized moderation context", async () => {
        const shared = await Contribution.create({
            contributionId: "shared-context-review",
            uploadedBy: f.actors.owner.person.id,
            courseCode: "AUTH301",
            parentFolder: f.leaf.id,
            files: [f.pending._id],
            approved: false,
        });
        const queue = await (await request("currentBR", "POST", "/api/contribution/br", {})).json();
        const item = queue.unverifiedContributions.find(
            (c) => c.contributionId === shared.contributionId,
        );
        assert.equal(item.courseCode, "AUTH301");
        assert.equal(item.managementCourseCode, "AUTH101");
        assert.equal(item.files[0].capabilities.canManage, true);
        const dashboard = await (
            await request("admin", "GET", "/api/admin/course/AUTH101/dashboard")
        ).json();
        assert.ok(dashboard.contributions.some((c) => c.contributionId === shared.contributionId));
        await request(
            "admin",
            "POST",
            "/api/admin/contribution/action",
            { contributionId: shared.contributionId, courseCode: "AUTH201", action: "approve" },
            404,
        );
        await request("admin", "POST", "/api/admin/contribution/action", {
            contributionId: shared.contributionId,
            courseCode: "AUTH101",
            action: "approve",
        });
        assert.equal((await FileModel.findById(f.pending.id)).isVerified, true);
        await Contribution.deleteOne({ _id: shared._id });
    });
    await t.test(
        "authorized BRs retain rename, moderation, year and folder management; shared descendants inherit membership",
        async () => {
            await request("historicalBR", "PUT", `/api/files/rename/${f.pending.id}`, {
                courseCode: "AUTH101",
                newName: "Renamed pending",
            });
            assert.equal((await FileModel.findById(f.pending.id)).name, "Renamed pending.pdf");
            await request("currentBR", "PUT", `/api/files/verify/${f.pending.id}`, {
                courseCode: "AUTH101",
            });
            assert.equal((await Contribution.findById(f.contribution.id)).approved, true);
            const created = await (
                await request("currentBR", "POST", "/api/folder/create", {
                    course: "AUTH101",
                    parentFolder: f.root.id,
                    name: "Shared descendant",
                    childType: "File",
                })
            ).json();
            assert.deepEqual(created.courses.sort(), ["AUTH101", "AUTH301"]);
            await request("currentBR", "POST", "/api/folder/rename", {
                courseCode: "AUTH101",
                folderId: created._id,
                newName: "Renamed descendant",
            });
            const otherCourse = await (
                await request("student", "GET", "/api/course/AUTH301")
            ).json();
            assert.ok(
                otherCourse.children[0].children.some((c) => c.name === "Renamed descendant"),
            );
            const year = await (
                await request("historicalBR", "POST", "/api/year", {
                    course: "AUTH101",
                    name: "2030",
                })
            ).json();
            const removedYear = await request(
                "historicalBR",
                "DELETE",
                "/api/year/delete",
                {
                    courseCode: "AUTH101",
                    folderId: year._id,
                },
                202,
            );
            await processOperation((await removedYear.json()).operationId);
            assert.equal(await FolderModel.findById(year._id), null);
        },
    );
    await t.test("revocation takes effect on the next request with the same session", async () => {
        await BR.deleteOne({ email: f.actors.currentBR.person.email.toUpperCase() });
        await request(
            "currentBR",
            "POST",
            "/api/folder/rename",
            { courseCode: "AUTH101", folderId: f.leaf.id, newName: "Denied" },
            403,
        );
        const user = await (await request("currentBR", "GET", "/api/user")).json();
        assert.equal(user.isBR, false);
        assert.deepEqual(user.capabilities.canManageCourses, []);
        await BR.create({ email: f.actors.currentBR.person.email });
    });
    await t.test(
        "Office previews authorize before redirecting an existing provider link",
        async () => {
            const office = await FileModel.create({
                name: "Review.docx",
                fileId: "provider-office",
                size: "10",
                isVerified: false,
                webUrl: "https://tenant.sharepoint.com/:w:/fixture",
                downloadUrl: "https://tenant.sharepoint.com/:w:/fixture",
            });
            await FolderModel.updateOne({ _id: f.leaf.id }, { $push: { children: office._id } });
            const denied = await fetch(origin + `/api/files/preview/${office.id}`, {
                headers: f.actors.student.headers,
                redirect: "manual",
            });
            assert.equal(denied.status, 404);
            assert.equal(denied.headers.get("location"), null);
            const allowed = await fetch(origin + `/api/files/preview/${office.id}`, {
                headers: f.actors.currentBR.headers,
                redirect: "manual",
            });
            assert.equal(allowed.status, 302);
            assert.equal(allowed.headers.get("location"), office.webUrl);
            await FolderModel.updateOne({ _id: f.leaf.id }, { $pull: { children: office._id } });
            await FileModel.deleteOne({ _id: office._id });
        },
    );
    await t.test(
        "uploading after BR revocation rechecks approval and ignores claimed uploader headers",
        async (sub) => {
            const operation = await (
                await request(
                    "currentBR",
                    "POST",
                    "/api/contribution",
                    {
                        courseCode: "AUTH101",
                        parentFolder: f.leaf.id,
                        description: "revocation test",
                        manifest: [{ name: "notes.pdf", size: 14 }],
                    },
                    201,
                )
            ).json();
            await BR.deleteOne({ email: f.actors.currentBR.person.email });
            sub.after(async () => {
                await BR.updateOne(
                    { email: f.actors.currentBR.person.email },
                    { $setOnInsert: { email: f.actors.currentBR.person.email } },
                    { upsert: true },
                );
            });
            sub.mock.method(storage, "upload", async () => ({ id: "provider-revoked-upload" }));
            const form = new FormData();
            form.append("file", new Blob(["revoked upload"]), "notes.pdf");
            const response = await fetch(origin + "/api/contribution/upload", {
                method: "POST",
                headers: {
                    ...Object.fromEntries(
                        Object.entries(f.actors.currentBR.headers).filter(
                            ([name]) => name !== "content-type",
                        ),
                    ),
                    "contribution-id": operation.id,
                    "upload-file-id": operation.entries[0].id,
                    username: "Administrator",
                    approved: "true",
                },
                body: form,
            });
            assert.equal(response.status, 202, await response.clone().text());
            await processOperation(operation.id);
            const finished = await OperationModel.findById(operation.id);
            assert.equal(finished.status, "completed", JSON.stringify(finished.error));
            const fileId = finished.entries[0].fileId;
            const file = await FileModel.findById(fileId);
            assert.equal(file.isVerified, false);
            assert.equal(file.name, "notes.pdf");
            assert.equal(file.contributorName, "Permission currentBR");
            assert.equal(
                (await Contribution.findOne({ contributionId: operation.id })).approved,
                false,
            );
            await FolderModel.updateOne({ _id: f.leaf.id }, { $pull: { children: file._id } });
            await FileModel.deleteOne({ _id: file._id });
            await Contribution.deleteOne({ contributionId: operation.id });
        },
    );
    await t.test(
        "shared removal unlinks only the active course and ignores forged descendants",
        async () => {
            const unlink = await request(
                "currentBR",
                "DELETE",
                "/api/folder/delete",
                {
                    courseCode: "AUTH101",
                    folderId: f.leaf.id,
                    folder: { _id: f.foreignLeaf.id, children: [f.foreign] },
                },
                202,
            );
            await processOperation((await unlink.json()).operationId);
            assert.ok(await FileModel.findById(f.pending.id));
            await FileModel.updateOne(
                { _id: f.pending.id },
                { $set: { "thumbnail.fileId": "owned-thumbnail" } },
            );
            assert.ok(await FileModel.findById(f.foreign.id));
            assert.equal(
                (await (await request("student", "GET", "/api/course/AUTH101")).json()).children[0]
                    .totalFileCount,
                0,
            );
            assert.equal(
                (await (await request("student", "GET", "/api/course/AUTH301")).json()).children[0]
                    .totalFileCount,
                2,
            );
            await request(
                "currentBR",
                "PUT",
                `/api/files/verify/${f.pending.id}`,
                { courseCode: "AUTH101" },
                404,
            );
            await request(
                "admin",
                "DELETE",
                `/api/admin/node/file/${f.pending.id}`,
                { courseCode: "AUTH101" },
                404,
            );
            const deletion = await request(
                "admin",
                "DELETE",
                `/api/admin/node/file/${f.pending.id}`,
                {
                    courseCode: "AUTH301",
                },
                202,
            );
            await processOperation((await deletion.json()).operationId);
            assert.equal(await FileModel.findById(f.pending.id), null);
            assert.deepEqual(deletedThumbnails, ["owned-thumbnail"]);
            assert.ok(
                providerCalls.some((url) =>
                    url.endsWith("/" + encodeURIComponent(f.pending.fileId)),
                ),
            );
            assert.ok(providerCalls.every((url) => !url.endsWith("/test-storage-root")));
        },
    );
}
