import assert from "node:assert/strict";
import { test } from "node:test";
import express from "express";
import axios from "axios";
import academic from "../config/academic.js";
import { needsPreviousCourseSync } from "../utils/courseHistory.js";
import { isBR } from "../middleware/isBR.js";

process.env.OPS_LOGGING_ENABLED = "false";

const { default: User } = await import("../modules/user/user.model.js");
const { default: UserUpdate } = await import("../modules/user/userUpdate.model.js");
const { default: BR } = await import("../modules/br/br.model.js");
const { default: CourseAllotment } = await import("../modules/course/courseAllotment.model.js");
const { default: CourseModel } = await import("../modules/course/course.model.js");
const { fetchPreviousCourses, fetchCoursesForBr, redirectHandler } = await import("../modules/auth/auth.controller.js");
const { default: appConfig } = await import("../config/default.js");
const { getUser } = await import("../modules/user/user.controller.js");
const { default: authRouter } = await import("../modules/auth/auth.routes.js");

const history = [{ semester: 1, year: 2025, courses: [{ code: "CS101", name: "Computing" }] }];

test("existing normal accounts need history sync; empty completed syncs and guests do not", () => {
    const user = { email: "student@iitg.ac.in", isBR: false, previousCourses: [] };
    assert.equal(needsPreviousCourseSync(user), true);
    assert.equal(needsPreviousCourseSync({ ...user, previousCourses: history }), false);
    assert.equal(needsPreviousCourseSync({ ...user, previousCoursesSyncedAt: new Date() }), false);
    assert.equal(needsPreviousCourseSync({ ...user, email: "guest@coursehubiitg.in" }), false);
});

test("user response includes history for normal users without granting BR status", async (t) => {
    t.mock.method(UserUpdate, "findOne", async () => ({}));
    t.mock.method(BR, "findOne", () => ({ collation: async () => null }));
    const user = { email: "student@iitg.ac.in", rollNumber: 250101001, isBR: false, previousCourses: history };
    const res = { status: (status) => { assert.equal(status, 200); return res; }, json: (data) => data };
    const response = await getUser({ user }, res);
    assert.deepEqual(response.previousCourses, history);
    assert.equal(response.isBR, false);
    assert.equal(response.needsCourseSync, false);
    const unsynced = await getUser({ user: { ...user, previousCourses: [] } }, res);
    assert.equal(unsynced.needsCourseSync, true);
});

test("existing BR accounts retain their role and course history", async (t) => {
    t.mock.method(UserUpdate, "findOne", async () => ({}));
    t.mock.method(BR, "findOne", () => ({ collation: async () => ({ email: "br@iitg.ac.in" }) }));
    const user = { email: "br@iitg.ac.in", rollNumber: 250101001, isBR: true, previousCourses: history };
    const res = { status: () => res, json: (data) => data };
    const response = await getUser({ user }, res);
    assert.equal(response.isBR, true);
    assert.equal(response.needsCourseSync, false);
    assert.deepEqual(response.previousCourses, history);
    assert.equal(fetchCoursesForBr, fetchPreviousCourses);
});

test("BR promotion still requires a fresh login", async (t) => {
    t.mock.method(UserUpdate, "findOne", async () => ({}));
    t.mock.method(BR, "findOne", () => ({ collation: async () => ({ email: "br@iitg.ac.in" }) }));
    const user = { email: "br@iitg.ac.in", rollNumber: 250101001, isBR: false, previousCourses: history, save: async () => {} };
    const save = t.mock.method(user, "save");
    const res = { cookie: () => {}, status: (status) => { assert.equal(status, 401); return res; }, json: (data) => data };
    const response = await getUser({ user }, res);
    assert.equal(user.isBR, true);
    assert.equal(save.mock.callCount(), 1);
    assert.equal(response.forceLogout, true);
});

test("login redirects normal users for history sync without changing existing BR redirects", async (t) => {
    const originalClientURL = appConfig.clientURL;
    appConfig.clientURL = "http://localhost";
    t.after(() => { appConfig.clientURL = originalClientURL; });
    const user = { email: "student@iitg.ac.in", rollNumber: 250101001, isBR: false, previousCourses: [], generateJWT: () => "test-token" };
    t.mock.method(axios, "post", async () => ({ data: { access_token: "test-access" } }));
    t.mock.method(axios, "get", async () => ({ data: { mail: user.email, surname: user.rollNumber } }));
    t.mock.method(User, "findOne", () => ({ collation: async () => user }));
    t.mock.method(BR, "findOne", () => ({ collation: async () => null }));
    t.mock.method(UserUpdate, "findOne", async () => ({}));
    const res = { cookie: () => {}, redirect: (url) => url };
    assert.equal(await redirectHandler({ query: { code: "test-code" } }, res), "http://localhost/loading");
    assert.equal(user.isBR, false);
    user.previousCoursesSyncedAt = new Date();
    const redirect = t.mock.method(res, "redirect");
    await redirectHandler({ query: { code: "test-code" } }, res);
    assert.equal(redirect.mock.calls.at(-1).arguments[0], "http://localhost/dashboard");
    user.isBR = true;
    user.previousCourses = history;
    await redirectHandler({ query: { code: "test-code" } }, res);
    assert.equal(redirect.mock.calls.at(-1).arguments[0], "http://localhost/dashboard");
});

function mockCachedHistory(t, rollNumber) {
    const year = Number(academic.currentYear);
    t.mock.method(CourseAllotment, "find", async (filter) => {
        assert.deepEqual(filter, { rollNumber });
        return [year - 1, year].flatMap((yr) => ["Jan-May", "July-Nov"].map((session) => ({
            year: yr, session, courses: ["CS101"],
        })));
    });
    t.mock.method(CourseModel, "find", async () => [{ code: "CS101", name: "Computing" }]);
    return t.mock.method(User, "updateOne", async () => ({}));
}

const rollNumber = Number(`${String(Number(academic.currentYear) - 1).slice(-2)}0101001`);

test("history fetch uses cached past semesters and excludes the current semester", async (t) => {
    const update = mockCachedHistory(t, rollNumber);
    t.mock.method(axios, "post", () => { throw new Error("Cached history must not call the portal"); });
    const courses = await fetchPreviousCourses(rollNumber);
    assert.deepEqual(courses.map((semester) => semester.semester), academic.session === "July-Nov" ? [1, 2] : [1]);
    assert.ok(courses.every((semester) => semester.courses[0].code === "CS101"));
    const [filter, change] = update.mock.calls[0].arguments;
    assert.deepEqual(filter, { rollNumber });
    assert.deepEqual(change.$set.previousCourses, courses);
    assert.ok(change.$set.previousCoursesSyncedAt instanceof Date);
    assert.equal("isBR" in change.$set, false);
});

test("history selection excludes current and future semesters in both academic sessions", async (t) => {
    const originalSession = academic.session;
    t.after(() => { academic.session = originalSession; });
    mockCachedHistory(t, rollNumber);
    t.mock.method(axios, "post", () => { throw new Error("Unexpected portal request"); });
    for (const [session, semesters] of [["Jan-May", [1]], ["July-Nov", [1, 2]]]) {
        academic.session = session;
        assert.deepEqual((await fetchPreviousCourses(rollNumber)).map((group) => group.semester), semesters);
    }
});

test("students with no past semesters are marked synced even with an empty history", async (t) => {
    const originalSession = academic.session;
    academic.session = "July-Nov";
    t.after(() => { academic.session = originalSession; });
    t.mock.method(CourseAllotment, "find", async () => []);
    t.mock.method(CourseModel, "find", async () => []);
    const update = t.mock.method(User, "updateOne", async () => ({}));
    const firstYearRoll = Number(`${academic.currentYear.slice(-2)}0101001`);
    assert.deepEqual(await fetchPreviousCourses(firstYearRoll), []);
    const synced = update.mock.calls[0].arguments[1].$set;
    assert.equal(needsPreviousCourseSync({ email: "student@iitg.ac.in", ...synced }), false);
});

test("failed portal fetches leave course history available for a retry", async (t) => {
    t.mock.method(CourseAllotment, "find", async () => []);
    t.mock.method(CourseModel, "find", async () => []);
    t.mock.method(axios, "post", async () => { throw new Error("Portal unavailable"); });
    const update = t.mock.method(User, "updateOne", async () => ({}));
    await assert.rejects(fetchPreviousCourses(rollNumber), /Portal unavailable/);
    assert.equal(update.mock.callCount(), 0);
});

test("history endpoint requires login and fetches the signed-in student's courses", async (t) => {
    const update = mockCachedHistory(t, rollNumber);
    t.mock.method(User, "findByJWT", async (token) => token === "normal-token" ? { rollNumber, isBR: false } : false);
    const app = express();
    app.use(express.json());
    app.use((req, res, next) => { req.cookies = {}; next(); });
    app.use("/api/auth", authRouter);
    app.use((error, req, res, next) => res.status(error.status || 500).json({ error: error.message }));
    const server = await new Promise((resolve) => {
        const listener = app.listen(0, "127.0.0.1", () => resolve(listener));
    });
    t.after(() => new Promise((resolve) => { server.close(resolve); server.closeAllConnections(); }));
    const root = `http://127.0.0.1:${server.address().port}/api/auth`;
    const unauthenticated = await fetch(`${root}/fetchPreviousCourses`, { method: "POST" });
    assert.equal(unauthenticated.status, 403);
    assert.equal(update.mock.callCount(), 0);
    for (const endpoint of ["fetchPreviousCourses", "fetchCoursesForBr"]) {
        const response = await fetch(`${root}/${endpoint}`, {
            method: "POST",
            headers: { authorization: "Bearer normal-token", "content-type": "application/json" },
            body: JSON.stringify({ rollNumber: 990101001 }),
        });
        assert.equal(response.status, 200);
        assert.ok((await response.json()).courses.length > 0);
    }
    assert.ok(update.mock.calls.every((call) => call.arguments[0].rollNumber === rollNumber));
});

test("having previous courses does not authorize BR actions", () => {
    let nextCalled = false;
    const res = { status: (status) => { assert.equal(status, 403); return res; }, json: () => {} };
    isBR({ user: { isBR: false, previousCourses: history } }, res, () => { nextCalled = true; });
    assert.equal(nextCalled, false);
    isBR({ user: { isBR: true, previousCourses: history } }, res, () => { nextCalled = true; });
    assert.equal(nextCalled, true);
});
