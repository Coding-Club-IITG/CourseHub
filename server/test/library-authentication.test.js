import "./support/environment.js";
import assert from "node:assert/strict";
import { before, beforeEach, after, test } from "node:test";
import { once } from "node:events";
import fs from "node:fs";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import axios from "axios";
import { guardExternalServices } from "./support/provider-guards.js";
import { app } from "../index.js";
import User from "../modules/user/user.model.js";
import Admin from "../modules/admin/admin.model.js";
import Course, { FileModel } from "../modules/course/course.model.js";
import CourseAllotment from "../modules/course/courseAllotment.model.js";
import Contribution from "../modules/contribution/contribution.model.js";
import { upload } from "../modules/contribution/contribution.routes.js";
import { student, administrator, course, libraryFile } from "./fixtures/library.js";

beforeEach(guardExternalServices);

let listener;
let origin;
before(async () => {
    listener = app.listen(0, "127.0.0.1");
    await once(listener, "listening");
    origin = `http://127.0.0.1:${listener.address().port}`;
});
after(async () => {
    listener.closeAllConnections();
    await new Promise((resolve) => listener.close(resolve));
});

const studentToken = (options = {}) =>
    jwt.sign({ user: student._id }, process.env.JWT_SECRET, options);
const adminToken = () => jwt.sign(administrator._id, process.env.ADMIN_JWT_SECRET);
const query = (value) => ({
    select() {
        return this;
    },
    populate() {
        return this;
    },
    lean() {
        return this;
    },
    then(resolve, reject) {
        return Promise.resolve(value).then(resolve, reject);
    },
});
function signedIn(t, actor = student) {
    t.mock.method(User, "findOne", async ({ _id }) => (_id === actor._id ? actor : null));
    t.mock.method(Admin, "findById", async (id) =>
        id === administrator._id ? administrator : null,
    );
}
function blockIO(t) {
    const attempts = [];
    const reject = (name) => () => {
        attempts.push(name);
        throw new Error(`Unexpected ${name}`);
    };
    for (const method of [
        "find",
        "findOne",
        "findById",
        "create",
        "updateOne",
        "deleteOne",
        "deleteMany",
        "findOneAndUpdate",
        "aggregate",
        "countDocuments",
    ]) {
        t.mock.method(mongoose.Model, method, reject(`database.${method}`));
    }
    for (const method of ["get", "post", "put", "patch", "delete", "request"]) {
        t.mock.method(axios, method, reject(`provider.${method}`));
    }
    const originalFetch = globalThis.fetch;
    t.mock.method(globalThis, "fetch", (url, ...rest) => {
        if (!String(url).startsWith(origin + "/")) return reject("provider.fetch")();
        return originalFetch(url, ...rest);
    });
    const existsSync = fs.existsSync;
    t.mock.method(fs, "existsSync", (path) =>
        String(path).endsWith(".token") ? reject("token file")() : existsSync(path),
    );
    t.mock.method(Object.getPrototypeOf(upload.storage), "_handleFile", (req, file, callback) => {
        attempts.push("multipart storage");
        callback(new Error("Unexpected multipart storage"));
    });
    return attempts;
}

const publicActions = new Set([
    "GET /api/auth/login",
    "GET /api/auth/login/redirect",
    "GET /api/auth/logout",
    "POST /api/admin/auth/login",
    "POST /api/admin/auth/logout",
]);
const protectedRoutes = [];
for (const [prefix, module] of [
    ["auth", "auth"],
    ["user", "user"],
    ["course", "course"],
    ["search", "search"],
    ["event", "event"],
    ["contribution", "contribution"],
    ["admin", "admin"],
    ["br", "br"],
    ["files", "file"],
    ["file", "onedrive"],
    ["folder", "folder"],
    ["year", "year"],
    ["student", "student"],
]) {
    const { default: router } = await import(`../modules/${module}/${module}.routes.js`);
    for (const { route } of router.stack) {
        if (!route) continue;
        for (const method of Object.keys(route.methods)) {
            const path = `/api/${prefix}${route.path}`.replace(/\/$/, "");
            if (publicActions.has(`${method.toUpperCase()} ${path}`)) continue;
            const concrete = path.replace(/:([a-zA-Z]+)/g, (_, name) =>
                name === "code" ? "CS101" : name === "type" ? "file" : libraryFile._id,
            );
            protectedRoutes.push([method.toUpperCase(), concrete]);
            if (method === "get") protectedRoutes.push(["HEAD", concrete]);
        }
    }
}

for (const [label, headers] of [
    ["missing session", {}],
    ["invalid bearer", { authorization: "Bearer invalid-signature" }],
    ["expired student session", { cookie: `token=${studentToken({ expiresIn: -1 })}` }],
    [
        "expired administrator session",
        {
            cookie: `adminToken=${jwt.sign({ sub: administrator._id }, process.env.ADMIN_JWT_SECRET, { expiresIn: -1 })}`,
        },
    ],
]) {
    test(`${label}: every protected route rejects before database, multipart or provider work`, async (t) => {
        const attempts = blockIO(t);
        for (const [method, path] of protectedRoutes) {
            const multipart = path.endsWith("/upload") || path.endsWith("/bulk-link");
            const body = ["GET", "HEAD"].includes(method)
                ? undefined
                : multipart
                  ? '--fixture\r\nContent-Disposition: form-data; name="file"; filename="test.pdf"\r\nContent-Type: application/pdf\r\n\r\n%PDF-test\r\n--fixture--\r\n'
                  : JSON.stringify({ code: "CS101", words: ["CS101"], rollNumber: 999999999 });
            const response = await fetch(origin + path, {
                method,
                headers: {
                    ...headers,
                    "content-type": multipart
                        ? "multipart/form-data; boundary=fixture"
                        : "application/json",
                },
                body,
                signal: AbortSignal.timeout(3000),
            });
            assert.equal(response.status, 401, `${method} ${path}`);
            assert.match(response.headers.get("content-type"), /application\/json/);
            await response.arrayBuffer();
        }
        assert.deepEqual(attempts, []);
        t.diagnostic(`${protectedRoutes.length} current route/method combinations checked`);
    });
}

test("public authentication entry and minimal health work; unknown API requests remain JSON", async (t) => {
    const attempts = blockIO(t);
    const health = await fetch(origin + "/api/health");
    assert.equal(health.status, 200);
    assert.deepEqual(await health.json(), { status: "ok" });
    const login = await fetch(origin + "/api/auth/login", { redirect: "manual" });
    assert.equal(login.status, 302);
    assert.equal(new URL(login.headers.get("location")).hostname, "login.microsoftonline.com");
    for (const method of ["GET", "HEAD", "POST", "DELETE"]) {
        const response = await fetch(origin + "/api/not-a-resource", { method });
        assert.equal(response.status, 404);
        assert.match(response.headers.get("content-type"), /application\/json/);
    }
    assert.deepEqual(attempts, []);
});

test("student and administrator cookie/bearer sessions can read courses", async (t) => {
    signedIn(t);
    t.mock.method(Course, "find", () => query([course]));
    t.mock.method(Course, "findOne", () => query({ toObject: () => structuredClone(course) }));
    for (const headers of [
        { cookie: `token=${studentToken()}` },
        { authorization: `Bearer ${studentToken()}` },
        { cookie: `adminToken=${adminToken()}` },
        { authorization: `Bearer ${adminToken()}` },
        { cookie: `token=expired; adminToken=${adminToken()}` },
    ]) {
        for (const path of ["/api/course", "/api/course/CS101"]) {
            const response = await fetch(origin + path, { headers });
            assert.equal(response.status, 200);
            const data = await response.json();
            assert.equal((Array.isArray(data) ? data[0] : data).code, "CS101");
        }
    }
});

test("missing-course reads return 404 without creating content", async (t) => {
    signedIn(t);
    t.mock.method(Course, "findOne", () => query(null));
    const create = t.mock.method(Course, "create", () =>
        assert.fail("GET must not create a course"),
    );
    const response = await fetch(origin + "/api/course/MISSING", {
        headers: { cookie: `token=${studentToken()}` },
    });
    assert.equal(response.status, 404);
    assert.equal(create.mock.callCount(), 0);
});

test("students cannot create courses or perform BR/administrator actions", async (t) => {
    signedIn(t);
    const create = t.mock.method(Course, "create", () => assert.fail("Denied creation"));
    for (const [method, path] of [
        ["POST", "/api/course/create/CS101"],
        ["GET", "/api/admin/dbcourses"],
        ["DELETE", `/api/files/unverify/${libraryFile._id}`],
        ["POST", "/api/folder/create"],
        ["POST", "/api/contribution/br"],
    ]) {
        const response = await fetch(origin + path, {
            method,
            headers: { cookie: `token=${studentToken()}` },
        });
        assert.equal(response.status, 403, path);
    }
    assert.equal(create.mock.callCount(), 0);
});

test("removed accounts and shared-account credentials cannot establish a student session", async (t) => {
    t.mock.method(User, "findOne", async () => null);
    let response = await fetch(origin + "/api/course", {
        headers: { cookie: `token=${studentToken()}` },
    });
    assert.equal(response.status, 401);
    t.mock.method(User, "findOne", async () => ({ ...student, email: "guest@coursehubiitg.in" }));
    response = await fetch(origin + "/api/course", {
        headers: { cookie: `token=${studentToken()}` },
    });
    assert.equal(response.status, 401);
});

test("malformed signed identities do not reach a database query", async (t) => {
    const attempts = blockIO(t);
    for (const token of [
        jwt.sign({ user: { $ne: null } }, process.env.JWT_SECRET),
        jwt.sign({ user: "invalid-id" }, process.env.JWT_SECRET),
        jwt.sign({ user: student._id }, process.env.ADMIN_JWT_SECRET),
    ]) {
        const response = await fetch(origin + "/api/course", {
            headers: { authorization: `Bearer ${token}` },
        });
        assert.equal(response.status, 401);
    }
    assert.deepEqual(attempts, []);
});

test("signed-in search, thumbnail and contribution listing still work", async (t) => {
    signedIn(t);
    t.mock.method(Course, "find", () => query([course]));
    t.mock.method(FileModel, "findOne", () => query(libraryFile));
    t.mock.method(Contribution, "find", () => query([]));
    const headers = { cookie: `token=${studentToken()}`, "content-type": "application/json" };
    for (const [path, body] of [
        ["/api/search", { words: ["CS101"] }],
        ["/api/file/thumbnail", { fileId: libraryFile.fileId }],
    ]) {
        const response = await fetch(origin + path, {
            method: "POST",
            headers,
            body: JSON.stringify(body),
        });
        assert.equal(response.status, 200, path);
    }
    const response = await fetch(origin + "/api/contribution", { headers });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), []);
});

test("course refresh derives its target from the authenticated student", async (t) => {
    signedIn(t);
    const lookups = [];
    t.mock.method(CourseAllotment, "findOne", async (filter) => {
        lookups.push(filter);
        return { courses: ["CS101"] };
    });
    t.mock.method(Course, "find", () => query([course]));
    const updates = [];
    t.mock.method(User, "updateOne", async (filter) => {
        updates.push(filter);
        return { modifiedCount: 1 };
    });
    const headers = { cookie: `token=${studentToken()}`, "content-type": "application/json" };
    for (const body of [{}, { rollNumber: student.rollNumber }]) {
        const response = await fetch(origin + "/api/auth/fetchCourses", {
            method: "POST",
            headers,
            body: JSON.stringify(body),
        });
        assert.equal(response.status, 200);
        assert.equal((await response.json()).courses[0].code, "CS101");
    }
    assert.ok(lookups.every((filter) => filter.rollNumber === student.rollNumber));
    assert.ok(updates.every((filter) => filter.rollNumber === student.rollNumber));
    const before = lookups.length;
    for (const path of ["/api/auth/fetchCourses", "/api/auth/fetchCoursesForBr"]) {
        const response = await fetch(origin + path, {
            method: "POST",
            headers,
            body: JSON.stringify({ rollNumber: 999999999 }),
        });
        assert.equal(response.status, 403);
    }
    assert.equal(lookups.length, before);
});
