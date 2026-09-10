import "../support/environment.js";
import { sessionHeaders, testOrigin } from "../fixtures/sessions.js";
import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import mongoose from "mongoose";
import fs from "node:fs";
import path from "node:path";
import axios from "axios";
import User from "../../modules/user/user.model.js";
import { Readable } from "node:stream";
import { storage } from "../../services/storage.js";
import { OperationModel } from "../../modules/operation/operation.model.js";
import { processOperation } from "../../services/operationWorker.js";
import CourseAllotment from "../../modules/course/courseAllotment.model.js";
import { academicPeriod } from "../../services/authorization.js";
import Course, { FolderModel, FileModel } from "../../modules/course/course.model.js";
import Contribution from "../../modules/contribution/contribution.model.js";
import { upload } from "../../middleware/receiveUpload.js";
import { guardExternalServices } from "../support/provider-guards.js";
import { student, course, year, folder } from "../fixtures/library.js";
import { app } from "../../index.js";
import Admin from "../../modules/admin/admin.model.js";
import { provisionAdmin } from "../../modules/admin/admin.provisioning.js";

beforeEach(guardExternalServices);

const owner = randomUUID();
const password = "database-fixture-password-only";
let ownsDatabase = false;
let listener;
let origin;

before(async () => {
    const uri = process.env.TEST_MONGO_URI;
    assert.ok(uri, "Set TEST_MONGO_URI to an empty isolated coursehub_test_ database");
    const target = new URL(uri);
    assert.match(
        decodeURIComponent(target.pathname),
        /^\/coursehub_test_[a-zA-Z0-9_-]+$/,
        "Refusing a database outside the coursehub_test_ namespace",
    );
    await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 5000,
        autoIndex: false,
        autoCreate: false,
    });
    const db = mongoose.connection.db;
    assert.deepEqual(
        await db.listCollections({}, { nameOnly: true }).toArray(),
        [],
        "Refusing a nonempty test database",
    );
    await db.collection("_testRun").insertOne({ _id: "owner", token: owner });
    ownsDatabase = true;
    await OperationModel.createIndexes();

    listener = app.listen(0, "127.0.0.1");
    await once(listener, "listening");
    origin = `http://127.0.0.1:${listener.address().port}`;
});

after(async () => {
    try {
        if (listener) {
            const closed = new Promise((resolve, reject) =>
                listener.close((error) => (error ? reject(error) : resolve())),
            );
            listener.closeAllConnections();
            await closed;
        }
        if (ownsDatabase) {
            const marker = await mongoose.connection.db
                .collection("_testRun")
                .findOne({ _id: "owner" });
            assert.equal(
                marker?.token,
                owner,
                "Refusing cleanup without this run's ownership marker",
            );
            assert.match(mongoose.connection.name, /^coursehub_test_[a-zA-Z0-9_-]+$/);
            await mongoose.connection.db.dropDatabase();
        }
    } finally {
        await mongoose.disconnect();
    }
});

test("administrator linking multipart rejection cleans up temporary files", async (t) => {
    const admin = await Admin.create({ userId: "multipart-admin", password });
    t.after(() => Admin.deleteOne({ _id: admin._id }));
    const headers = await sessionHeaders(admin.id, "admin");
    fs.mkdirSync("uploads", { recursive: true });
    const beforeFiles = fs.readdirSync("uploads").sort();
    const invalid = new FormData();
    invalid.append("file", new Blob(["QA6002,Must Not Import\n"]), "courses.csv");
    invalid.append("items[4294967294]", "invalid");
    const response = await fetch(origin + "/api/admin/courses/bulk-link", {
        method: "POST",
        headers,
        body: invalid,
    });
    assert.equal(response.status, 400);
    await response.json();
    assert.equal(await Course.exists({ code: "QA6002" }), null);
    assert.deepEqual(fs.readdirSync("uploads").sort(), beforeFiles);
});

test("provisioned password hashes work with the existing administrator login", async () => {
    const result = await provisionAdmin({ userId: "login-fixture", password });
    const stored = await Admin.findById(result.id);
    assert.notEqual(stored.password, password);
    assert.equal(await stored.comparePassword(password), true);
    assert.equal(await stored.comparePassword("wrong-fixture-password"), false);
    const response = await fetch(origin + "/api/admin/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json", origin: testOrigin },
        body: JSON.stringify({ userId: "login-fixture", password }),
    });
    assert.equal(response.status, 200);
    const loginData = await response.json();
    assert.equal(loginData.success, true);
    assert.match(response.headers.get("set-cookie"), /adminToken=/);

    const headers = { cookie: response.headers.get("set-cookie").split(";")[0] };
    const session = await fetch(origin + "/api/admin/", { headers });
    assert.equal(session.status, 200);
    assert.deepEqual(await session.json(), {
        csrfToken: loginData.csrfToken,
        user: {
            userId: "login-fixture",
            capabilities: { canManageAllCourses: true, canModerate: true },
        },
    });
    const courses = await fetch(origin + "/api/admin/dbcourses", { headers });
    assert.equal(courses.status, 200);
    assert.deepEqual(await courses.json(), { items: [], page: 1, pageSize: 20, total: 0 });
});

test("repeat provisioning cannot replace an existing hash or identity", async () => {
    const first = await provisionAdmin({ userId: "existing-fixture", password });
    const original = await Admin.findById(first.id).lean();
    await assert.rejects(
        provisionAdmin({ userId: " existing-fixture ", password: "different-fixture-password" }),
        { code: "ADMIN_EXISTS" },
    );
    assert.deepEqual(await Admin.findById(first.id).lean(), original);
    assert.equal(await Admin.countDocuments({ userId: "existing-fixture" }), 1);
});

test("concurrent provisioning creates one administrator with a unique indexed ID", async () => {
    const outcomes = await Promise.allSettled([
        provisionAdmin({ userId: "concurrent-fixture", password }),
        provisionAdmin({ userId: "concurrent-fixture", password }),
    ]);
    assert.equal(outcomes.filter((o) => o.status === "fulfilled").length, 1);
    assert.equal(outcomes.find((o) => o.status === "rejected").reason.code, "ADMIN_EXISTS");
    assert.equal(await Admin.countDocuments({ userId: "concurrent-fixture" }), 1);
    const index = (await Admin.collection.indexes()).find((i) => i.key.userId === 1);
    assert.equal(index.unique, true);
});

test("the provisioning CLI creates an account and refuses a subsequent reset", async () => {
    const run = (candidate) =>
        spawnSync(
            process.execPath,
            [fileURLToPath(new URL("../../scripts/provisionAdmin.js", import.meta.url))],
            {
                encoding: "utf8",
                timeout: 5000,
                env: {
                    ...process.env,
                    MONGO_URI: process.env.TEST_MONGO_URI,
                    ADMIN_USER_ID: "cli-fixture",
                    ADMIN_PASSWORD: candidate,
                },
            },
        );
    const created = run(password);
    assert.equal(created.error, undefined);
    assert.equal(created.status, 0, created.stderr);
    assert.match(created.stdout, /Created administrator: cli-fixture/);
    assert.equal(created.stdout.includes(password), false);
    const saved = await Admin.findOne({ userId: "cli-fixture" });
    assert.equal(await saved.comparePassword(password), true);
    const original = saved.toObject();
    const repeated = run("different-cli-fixture-password");
    assert.equal(repeated.error, undefined);
    assert.equal(repeated.status, 1);
    assert.match(repeated.stderr, /already exists/);
    assert.deepEqual(await Admin.findById(saved._id).lean(), original);
});

function probeTarget(uri) {
    // Select only the login test so this nested run cannot recurse into
    // these safeguards. Its before hook must refuse the target before fixtures.
    const env = { ...process.env, TEST_MONGO_URI: uri };
    delete env.NODE_TEST_CONTEXT;
    return spawnSync(
        process.execPath,
        [
            "--test",
            "--test-name-pattern=provisioned password hashes",
            fileURLToPath(import.meta.url),
        ],
        {
            encoding: "utf8",
            timeout: 10000,
            env,
        },
    );
}

test("the database suite refuses an application database name before connecting", () => {
    const result = probeTarget("mongodb://127.0.0.1:1/coursehub");
    assert.equal(result.error, undefined);
    assert.equal(result.status, 1);
    assert.match(
        result.stdout + result.stderr,
        /Refusing a database outside the coursehub_test_ namespace/,
    );
});

test("the database suite leaves a nonempty test target intact", async () => {
    const beforeCollections = await mongoose.connection.db
        .listCollections({}, { nameOnly: true })
        .toArray();
    const beforeAdmins = JSON.stringify(await Admin.find({}).sort({ _id: 1 }).lean());
    const result = probeTarget(process.env.TEST_MONGO_URI);
    assert.equal(result.error, undefined);
    assert.equal(result.status, 1);
    assert.match(result.stdout + result.stderr, /Refusing a nonempty test database/);
    assert.deepEqual(
        await mongoose.connection.db.listCollections({}, { nameOnly: true }).toArray(),
        beforeCollections,
    );
    assert.equal(JSON.stringify(await Admin.find({}).sort({ _id: 1 }).lean()), beforeAdmins);
    assert.equal(
        (await mongoose.connection.db.collection("_testRun").findOne({ _id: "owner" })).token,
        owner,
    );
});

test("authenticated browsing and multipart upload persist content with mocked Graph storage", async (t) => {
    const person = await User.create(student);
    await CourseAllotment.create({
        rollNumber: person.rollNumber,
        ...academicPeriod(),
        courses: ["CS101"],
    });

    await FolderModel.create({ ...folder, children: [] });
    await FolderModel.create({ ...year, children: [folder._id] });
    await Course.create({ ...course, children: [year._id] });
    const headers = await sessionHeaders(person.id);
    for (const route of [
        "/api/user",
        "/api/course/CS101",
        `/api/folder/content/${folder._id}?courseCode=CS101`,
    ]) {
        const response = await fetch(origin + route, { headers });
        assert.equal(response.status, 200, route);
        await response.json();
    }
    const absent = await fetch(origin + "/api/course/MISSING", { headers });
    assert.equal(absent.status, 404);
    assert.equal(await Course.countDocuments(), 1);
    const unsigned = await fetch(origin + "/api/course/CS101");
    assert.equal(unsigned.status, 401);

    const contents = Buffer.from("%PDF-1.4\nSynthetic upload test\n%%EOF\n");
    const filename = "notes.pdf";
    const created = await fetch(origin + "/api/contribution", {
        method: "POST",
        headers: {
            ...headers,
            "content-type": "application/json",
            "idempotency-key": randomUUID(),
        },
        body: JSON.stringify({
            courseCode: "CS101",
            parentFolder: folder._id,
            description: "Test upload",
            manifest: [0, 1].map(() => ({ name: filename, size: contents.length })),
        }),
    });
    assert.equal(created.status, 201, await created.clone().text());
    const operation = await created.json();
    const remoteNames = [];
    const temporaryPaths = [];
    t.mock.method(storage, "upload", async (args) => {
        remoteNames.push(args.remoteName);
        temporaryPaths.push(args.filename);
        assert.deepEqual(await fs.promises.readFile(args.filename), contents);
        assert.match(path.basename(args.filename), /^[a-f0-9-]{36}\.upload$/);
        return { id: "test-uploaded-drive-file-" + remoteNames.length };
    });
    t.mock.method(storage, "content", async () => ({
        data: Readable.from([contents]),
        headers: { "content-type": "application/pdf" },
    }));
    for (const entry of operation.entries) {
        const form = new FormData();
        form.append("file", new Blob([contents]), filename);
        const response = await fetch(origin + "/api/contribution/upload", {
            method: "POST",
            headers: {
                ...headers,
                "contribution-id": operation.id,
                "upload-file-id": entry.id,
                username: "forged",
            },
            body: form,
        });
        assert.equal(response.status, 202, await response.clone().text());
    }
    assert.equal(await processOperation(operation.id), true);
    const completed = await (
        await fetch(origin + "/api/operations/" + operation.id, { headers })
    ).json();
    assert.equal(completed.status, "completed", JSON.stringify(completed));
    assert.equal(
        new Set(remoteNames).size,
        2,
        "Equal display names have distinct storage identities",
    );
    for (const entry of completed.entries) {
        const saved = await FileModel.findById(entry.fileId);
        assert.equal(saved.isVerified, false);
        assert.equal(saved.sizeBytes, contents.length);
        assert.equal(saved.name, filename);
        assert.equal(saved.contributorName, person.name);
        const contribution = await Contribution.findOne({ contributionId: operation.id });
        assert.equal(contribution.uploadedBy, person.id);
        assert.ok(contribution.files.some((id) => String(id) === entry.fileId));
        assert.ok(
            (await FolderModel.findById(folder._id)).children.some(
                (id) => String(id) === entry.fileId,
            ),
        );
        const download = await fetch(origin + "/api/files/content/" + entry.fileId, { headers });
        assert.equal(download.status, 200);
        assert.deepEqual(Buffer.from(await download.arrayBuffer()), contents);
    }
    assert.equal(temporaryPaths.length, 2);
    assert.ok(temporaryPaths.every((filename) => !fs.existsSync(filename)));
    const retry = new FormData();
    retry.append("file", new Blob([contents]), filename);
    const replay = await fetch(origin + "/api/contribution/upload", {
        method: "POST",
        headers: {
            ...headers,
            "contribution-id": operation.id,
            "upload-file-id": operation.entries[0].id,
        },
        body: retry,
    });
    assert.equal(replay.status, 202);
    assert.equal(remoteNames.length, 2, "A repeated upload request does not create another file");
});

test("an administrator session can explicitly create a course", async () => {
    await provisionAdmin({ userId: "course-manager-fixture", password });
    const login = await fetch(origin + "/api/admin/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json", origin: testOrigin },
        body: JSON.stringify({ userId: "course-manager-fixture", password }),
    });
    assert.equal(login.status, 200);
    const headers = {
        cookie: login.headers.get("set-cookie").split(";")[0],
        origin: testOrigin,
        "x-csrf-token": (await login.json()).csrfToken,
        "content-type": "application/json",
    };
    const created = await fetch(origin + "/api/course/create/QA202", {
        method: "POST",
        headers,
        body: JSON.stringify({ name: "Administrator-created test course" }),
    });
    assert.equal(created.status, 201);
    const { course: saved } = await created.json();
    assert.equal(saved.code, "QA202");
    assert.equal((await Course.findById(saved._id)).name, "Administrator-created test course");
    const response = await fetch(origin + "/api/course/QA202", { headers });
    assert.equal(response.status, 200);
    assert.deepEqual((await response.json()).children, []);
});

import { exerciseCoursePermissions } from "../support/course-permissions.js";
test("course permission and moderation boundaries", async (t) =>
    exerciseCoursePermissions(t, origin));

import { exerciseSessionSecurity } from "../support/session-security.js";
test("session, OAuth, CSRF and profile boundaries", async (t) =>
    exerciseSessionSecurity(t, origin));

import { exerciseOperations } from "../support/operations.js";
test("upload and deletion journal recovery", async (t) => exerciseOperations(t, origin));

import { exerciseSharedTrees } from "../support/shared-trees.js";
test("shared course trees and journaled linking", async (t) => exerciseSharedTrees(t, origin));

import { exerciseAcademicReferences } from "../support/academic-references.js";
test("course reference maintenance and academic synchronization", async (t) =>
    exerciseAcademicReferences(t, origin));

import { exerciseExams } from "../support/exams.js";
test("authenticated exam schedules and current registrations", async (t) =>
    exerciseExams(t, origin));

test("unknown destructive filters fail before changing any records", async () => {
    const files = await FileModel.find().sort({ _id: 1 }).lean();
    assert.ok(files.length > 0, "Exercise the filter guard against populated data");
    for (const query of [
        FileModel.deleteMany({ unrelatedCourse: "CS101" }),
        FileModel.deleteOne({ course: "CS101" }),
        FileModel.updateMany({ misspelledId: files[0]._id }, { $set: { name: "Must not change" } }),
        FileModel.findOneAndDelete({ unknown: true }),
    ])
        await assert.rejects(query.exec(), { name: "StrictModeError" });
    assert.deepEqual(await FileModel.find().sort({ _id: 1 }).lean(), files);
});

test("validated nested references survive persistence, population and a profile-only update", async () => {
    const history = [
        { semester: 1, year: 2024, courses: [{ code: "MODEL101", name: "Earlier course" }] },
    ];
    const person = await User.create({
        ...student,
        _id: new mongoose.Types.ObjectId(),
        email: "model-boundary@example.test",
        rollNumber: 240199987,
        previousCourses: history,
    });
    await User.findByIdAndUpdate(
        person.id,
        { $set: { name: "Updated profile" } },
        { runValidators: true },
    );
    assert.deepEqual((await User.findById(person.id).lean()).previousCourses, history);
    await assert.rejects(
        User.updateOne(
            { _id: person.id },
            { $set: { courses: [{ name: "No code" }] } },
            { runValidators: true },
        ),
        { name: "ValidationError" },
    );
    assert.deepEqual((await User.findById(person.id).lean()).courses, student.courses);
    await User.collection.updateOne(
        { _id: person._id },
        { $set: { previousCourses: [{ code: "OLD101", name: "Unconverted history" }] } },
    );
    const before = await User.findById(person.id).lean();
    await User.findByIdAndUpdate(
        person.id,
        { $set: { name: "Profile still editable" } },
        { runValidators: true },
    );
    assert.deepEqual(
        (await User.findById(person.id).lean()).previousCourses,
        before.previousCourses,
    );
});

test("administrator student pagination and detail contracts", async (t) => {
    const { exerciseStudentAdministration } = await import("../support/student-administration.js");
    await exerciseStudentAdministration(t, origin);
});

test("administrator course pagination and comparison contracts", async (t) => {
    const { exerciseCourseAdministration } = await import("../support/course-administration.js");
    await exerciseCourseAdministration(t, origin);
});

test("CSV imports preserve row results and recover through the existing journal", async (t) => {
    const { exerciseImports } = await import("../support/imports.js");
    await exerciseImports(t, origin);
});

test("BR coverage agrees with authoritative current and historical management rights", async (t) => {
    const { exerciseBRCoverage } = await import("../support/br-coverage.js");
    await exerciseBRCoverage(t, origin);
});

test("bulk linking receipts retain accepted jobs and scheduling failures without claiming completion", async (t) => {
    const { exerciseLinkReceipts } = await import("../support/link-receipts.js");
    await exerciseLinkReceipts(t, origin);
});
