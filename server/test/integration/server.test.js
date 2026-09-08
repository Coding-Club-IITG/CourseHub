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
import CourseAllotment from "../../modules/course/courseAllotment.model.js";
import { academicPeriod } from "../../services/authorization.js";
import UserUpdate from "../../modules/user/userUpdate.model.js";
import Course, { FolderModel, FileModel } from "../../modules/course/course.model.js";
import Contribution from "../../modules/contribution/contribution.model.js";
import { upload } from "../../modules/contribution/contribution.routes.js";
import { clearAccessTokenCache } from "../../modules/onedrive/onedrive.controller.js";
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
    assert.deepEqual(await courses.json(), []);
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
    await UserUpdate.create({ rollNumber: person.rollNumber });
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

    const created = await fetch(origin + "/api/contribution", {
        method: "POST",
        headers: { ...headers, "content-type": "application/json" },
        body: JSON.stringify({
            courseCode: "CS101",
            parentFolder: folder._id,
            description: "Test upload",
        }),
    });
    assert.equal(created.status, 200);
    const createdData = await created.json();
    assert.equal(createdData.created, true);
    const contributionId = createdData.data.contributionId;

    clearAccessTokenCache();
    t.after(clearAccessTokenCache);
    for (const method of ["existsSync", "readFileSync", "writeFileSync"]) {
        const original = fs[method];
        t.mock.method(fs, method, (file, ...rest) => {
            if (!String(file).endsWith(".token")) return original(file, ...rest);
            if (method === "existsSync") return true;
            if (method === "readFileSync") return "test-refresh-token";
        });
    }
    const calls = [];
    t.mock.method(axios, "post", async (url) => {
        calls.push(url);
        if (url.startsWith("https://login.microsoftonline.com/"))
            return {
                data: {
                    access_token: "test-access",
                    expires_in: 3600,
                    refresh_token: "test-refresh",
                },
            };
        if (url.endsWith("/createUploadSession")) {
            assert.ok(url.includes("/test-storage-root:/"));
            return { data: { uploadUrl: "https://upload.example.test/session" } };
        }
        if (url.endsWith("/createLink"))
            return { data: { link: { webUrl: "https://example.test/notes" } } };
        assert.fail(`Unexpected mock Graph POST: ${url}`);
    });
    const contents = Buffer.from("%PDF-1.4\nSynthetic upload test\n%%EOF\n");
    let uploadedCount = 0;
    t.mock.method(axios, "put", async (url, bytes, config) => {
        calls.push(url);
        assert.equal(url, "https://upload.example.test/session");
        assert.deepEqual(bytes, contents);
        assert.equal(
            config.headers["Content-Range"],
            `bytes 0-${contents.length - 1}/${contents.length}`,
        );
        return {
            data: {
                id: uploadedCount++ ? "second-uploaded-drive-file" : "test-uploaded-drive-file",
                size: contents.length,
            },
        };
    });
    t.mock.method(axios, "get", async (url) => {
        calls.push(url);
        if (url.endsWith("/thumbnails")) return { data: { value: [] } };
        if (url.endsWith("/test-uploaded-drive-file/content"))
            return {
                data: Readable.from([contents]),
                headers: { "content-type": "application/pdf" },
            };
        assert.fail(`Unexpected mock Graph GET: ${url}`);
    });
    const temporaryPaths = [];
    const handleFile = upload.storage._handleFile;
    t.mock.method(upload.storage, "_handleFile", function (req, file, callback) {
        handleFile.call(this, req, file, (error, info) => {
            if (info?.path) temporaryPaths.push(info.path);
            callback(error, info);
        });
    });
    const filename = `test-${randomUUID()}.pdf`;
    const renamedPath = path.join("external/uploads", filename.replace(".pdf", "~TestStudent.pdf"));
    t.after(async () => {
        for (const file of [...temporaryPaths, renamedPath])
            await fs.promises.rm(file, { force: true });
    });
    const form = new FormData();
    form.append("file", new Blob([contents], { type: "application/pdf" }), filename);
    const uploaded = await fetch(origin + "/api/contribution/upload", {
        method: "POST",
        headers: { ...headers, "contribution-id": contributionId, username: "TestStudent" },
        body: form,
    });
    assert.equal(uploaded.status, 200, await uploaded.clone().text());
    const id = await uploaded.text();
    const saved = await FileModel.findById(id);
    assert.equal(saved.fileId, "test-uploaded-drive-file");
    assert.equal(saved.isVerified, false);
    assert.equal(Number(saved.size), contents.length);
    const savedContribution = await Contribution.findOne({ contributionId });
    assert.equal(savedContribution.uploadedBy, person.id);
    assert.ok(savedContribution.files.some((file) => file.toString() === id));
    assert.ok(
        (await FolderModel.findById(folder._id)).children.some((file) => file.toString() === id),
    );
    assert.equal(temporaryPaths.length, 1);
    assert.ok(temporaryPaths.every((file) => !fs.existsSync(file)));
    assert.equal(fs.existsSync(renamedPath), false);
    const download = await fetch(origin + `/api/files/content/${id}`, {
        headers,
    });
    assert.equal(download.status, 200);
    assert.deepEqual(Buffer.from(await download.arrayBuffer()), contents);
    assert.equal(saved.name, filename.replace(".pdf", "~Library Test Student.pdf"));
    const secondForm = new FormData();
    secondForm.append("file", new Blob([contents], { type: "application/pdf" }), filename);
    const secondUpload = await fetch(origin + "/api/contribution/upload", {
        method: "POST",
        headers: { ...headers, "contribution-id": contributionId },
        body: secondForm,
    });
    assert.equal(secondUpload.status, 200);
    const second = await FileModel.findById(await secondUpload.text());
    assert.equal(second.name, saved.name);
    assert.notEqual(second.fileId, saved.fileId);
    const sessions = calls.filter((url) => url.endsWith("/createUploadSession"));
    assert.equal(sessions.length, 2);
    assert.equal(
        new Set(sessions).size,
        2,
        "Equal display names must target different storage paths",
    );
    assert.ok(temporaryPaths.every((file) => !fs.existsSync(file)));
    assert.equal(calls.filter((url) => url === "https://upload.example.test/session").length, 2);
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
