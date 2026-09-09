import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { student } from "../../fixtures/library.js";
import { examCourses, examResponse } from "../../fixtures/exams.js";

export async function examFixture(
    browser,
    t,
    { width = 1440, scenario = "scheduled", timezone = "Asia/Kolkata" } = {},
) {
    const frontend = process.env.BROWSER_CLIENT_ORIGIN || "http://127.0.0.1:4187";
    const context = await browser.newContext({
        viewport: { width, height: 900 },
        locale: "en-GB",
        timezoneId: timezone,
    });
    const data = structuredClone(examResponse);
    const user = { ...student, courses: structuredClone(examCourses) };
    const state = {
        data,
        status: scenario === "error" ? 503 : 200,
        signedIn: true,
        loading: scenario === "loading",
        release: null,
    };
    if (scenario === "excluded") {
        user.rollNumber = 260101001;
        user.semester = 1;
        data.status = "excluded";
        data.exams = {};
    }
    if (scenario === "empty") {
        user.courses = [];
        for (const type of Object.keys(data.exams))
            data.exams[type] = { status: "none", items: [], missingCourses: [], nextExam: null };
    }
    if (scenario === "unavailable" || scenario === "rollover") {
        data.status = "unavailable";
        data.reason = "SCHEDULE_UNAVAILABLE";
        data.exams = {};
    }
    if (scenario === "rollover") data.period = { year: 2027, session: "Jan-May" };
    if (scenario === "partial") {
        user.courses.push({ code: "QA999", name: "Course awaiting an exam slot" });
        for (const type of Object.keys(data.exams))
            Object.assign(data.exams[type], {
                status: "partial",
                missingCourses: [{ code: "QA999", name: "Course awaiting an exam slot" }],
                nextExam: null,
            });
    }
    if (scenario === "complete")
        for (const type of Object.keys(data.exams)) {
            Object.assign(data.exams[type], { status: "complete", nextExam: null });
            for (const item of data.exams[type].items) item.state = "finished";
        }
    if (scenario === "today") data.exams.midSem.nextExam.daysUntil = 0;
    const requests = [],
        errors = [];
    await context.route("**/api/**", async (route) => {
        const url = new URL(route.request().url());
        requests.push({
            path: url.pathname,
            method: route.request().method(),
            cookie: (await route.request().allHeaders()).cookie,
        });
        let body = {},
            status = state.signedIn ? 200 : 401;
        if (!state.signedIn) body = { message: "Sign in to continue" };
        else if (url.pathname === "/api/user") body = { ...user, csrfToken: "c".repeat(43) };
        else if (url.pathname === "/api/event/examdates") {
            if (state.loading)
                await new Promise((resolve) => {
                    state.release = resolve;
                });
            body =
                state.status === 200
                    ? state.data
                    : { message: "Exam schedule could not be loaded. Please retry." };
            status = state.status;
        } else if (url.pathname === "/api/operations") body = { items: [] };
        else if (url.pathname === "/api/contribution/limits")
            body = { fileBytes: 104857600, batchBytes: 1073741824, files: 40, concurrentFiles: 2 };
        else if (url.pathname === "/api/contribution/") body = [];
        else status = 404;
        await route
            .fulfill({ status, contentType: "application/json", body: JSON.stringify(body) })
            .catch(() => {});
    });
    const page = await context.newPage();
    page.setDefaultTimeout(7000);
    page.on("pageerror", (error) => errors.push(error.message));
    await page.clock.install({
        time: new Date(
            scenario === "rollover"
                ? "2027-01-01T06:30:00Z"
                : scenario === "complete"
                  ? "2026-12-01T06:30:00Z"
                  : scenario === "today"
                    ? "2026-09-13T02:00:00Z"
                    : "2026-09-09T06:30:00Z",
        ),
    });
    await context.addCookies([
        {
            name: "token",
            value: "synthetic",
            url: process.env.BROWSER_API_ORIGIN || "http://127.0.0.1:4185",
        },
    ]);
    t.after(async () => {
        state.release?.();
        if (process.env.BROWSER_ARTIFACT_DIR) {
            fs.mkdirSync(process.env.BROWSER_ARTIFACT_DIR, { recursive: true });
            await page.screenshot({
                path: path.join(
                    process.env.BROWSER_ARTIFACT_DIR,
                    t.name.replace(/[^a-z0-9-]+/gi, "-") + ".png",
                ),
                fullPage: true,
            });
        }
        await context.close();
        assert.deepEqual(errors, []);
    });
    return { page, context, state, requests, frontend, user };
}
