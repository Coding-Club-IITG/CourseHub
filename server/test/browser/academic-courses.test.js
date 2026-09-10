import { unavailableExamResponse } from "../fixtures/exams.js";
import assert from "node:assert/strict";
import { before, after, test } from "node:test";
import { createRequire } from "node:module";
import { student } from "../fixtures/library.js";
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || "playwright");
const client = process.env.BROWSER_CLIENT_ORIGIN || "http://127.0.0.1:4186";
const api = process.env.BROWSER_API_ORIGIN || "http://127.0.0.1:4185";
const admin = process.env.BROWSER_ADMIN_ORIGIN || "http://127.0.0.1:4184";
const operationId = "6eee49ee-7580-4b5f-ad6c-0441adf0139a";
let browser;
before(async () => {
    browser = await chromium.launch({
        headless: true,
        executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
    });
});
after(() => browser?.close());
async function fixture(t, width, administrator = false) {
    const context = await browser.newContext({
        viewport: { width, height: 900 },
        locale: "en-US",
        timezoneId: "Asia/Kolkata",
    });
    const page = await context.newPage();
    page.setDefaultTimeout(10000);
    const errors = [],
        requests = [],
        state = { status: "queued", submits: 0, saved: false, renameFailure: false };
    page.on("pageerror", (error) => errors.push(error.message));
    t.after(async () => {
        await context.close();
        assert.deepEqual(errors, []);
    });
    const origin = administrator ? admin : client;
    await context.route("**/*", async (route) => {
        const request = route.request(),
            url = new URL(request.url());
        if (![origin, api].includes(url.origin)) return route.abort();
        if (!url.pathname.startsWith("/api/")) return route.continue();
        requests.push({ path: url.pathname, method: request.method(), body: request.postData() });
        let status = 200,
            data = {};
        if (url.pathname === "/api/user")
            data = {
                ...student,
                needsCourseSync: !state.saved,
                previousCourses: [],
                csrfToken: "c".repeat(43),
            };
        else if (url.pathname === "/api/auth/csrf") data = { csrfToken: "c".repeat(43) };
        else if (url.pathname === "/api/admin/")
            data = { user: { userId: "Fixture admin" }, csrfToken: "c".repeat(43) };
        else if (url.pathname === "/api/admin/dbcourses")
            data = {
                items: [
                    {
                        _id: "507f1f77bcf86cd799439051",
                        code: state.saved ? "CS102" : "CS101",
                        name: state.saved ? "Saved name" : "Original course",
                        children: [],
                    },
                ],
                page: 1,
                pageSize: 20,
                total: 1,
            };
        else if (url.pathname === "/api/student/all")
            data = { items: [{ ...student, isRegistered: true }], page: 1, pageSize: 20, total: 1 };
        else if (url.pathname === "/api/br/allBRs")
            data = { items: [], page: 1, pageSize: 20, total: 0 };
        else if (url.pathname === "/api/operations") data = { items: [], total: 0 };
        else if (url.pathname === "/api/contribution/") data = [];
        else if (url.pathname === "/api/event/examdates") data = unavailableExamResponse;
        else if (
            url.pathname === "/api/user/synchronize" ||
            url.pathname.startsWith("/api/student/refresh/") ||
            (url.pathname === "/api/admin/course/cs101" && request.method() === "PATCH")
        ) {
            state.submits++;
            status = 202;
            if (url.pathname === "/api/user/synchronize")
                assert.deepEqual(JSON.parse(request.postData()), {});
            data = {
                operationId,
                kind: url.pathname.includes("/course/") ? "rename" : "academic-sync",
                status: "queued",
            };
        } else if (url.pathname === `/api/operations/${operationId}`) {
            data = {
                id: operationId,
                kind: administrator ? "rename" : "academic-sync",
                status: state.status,
                entries: [],
                completedSteps: 0,
                course: { code: "CS102", name: "Saved name" },
                synchronization: { message: "Courses synchronized successfully." },
                error:
                    state.status === "failed"
                        ? { message: "Refresh unavailable. Saved courses are preserved." }
                        : undefined,
            };
            if (state.status === "completed") state.saved = true;
        } else status = 404;
        await route
            .fulfill({ status, contentType: "application/json", body: JSON.stringify(data) })
            .catch(() => {});
    });
    return { page, state, requests, origin };
}
for (const width of [1440, 390]) {
    test(`a valid session with missing sync metadata keeps a direct profile destination at ${width}px`, async (t) => {
        const { page, requests } = await fixture(t, width);
        await page.goto(client + "/profile?tab=courses#history");
        await page.getByRole("button", { name: "Refresh registered courses" }).waitFor();
        assert.equal(
            new URL(page.url()).pathname + new URL(page.url()).search + new URL(page.url()).hash,
            "/profile?tab=courses#history",
        );
        assert.equal(
            requests.some((request) => request.path === "/api/user/synchronize"),
            false,
        );
    });
    test(`course refresh failure retains saved data and retry waits for completion at ${width}px`, async (t) => {
        const { page, state } = await fixture(t, width);
        state.status = "failed";
        await page.goto(client + "/loading?returnTo=%2Fprofile%3Ftab%3Dcourses%23history");
        await page.getByRole("heading", { name: "Course refresh unavailable" }).waitFor();
        assert.equal(
            await page
                .getByRole("link", { name: "Continue with saved courses" })
                .getAttribute("href"),
            "/profile?tab=courses#history",
        );
        state.status = "queued";
        await page.getByRole("button", { name: "Try again" }).click();
        await page.getByRole("heading", { name: "Refreshing your courses" }).waitFor();
        assert.equal(new URL(page.url()).pathname, "/loading");
        state.status = "completed";
        await page.waitForURL("**/profile?tab=courses#history");
        assert.ok(state.submits >= 2);
        assert.equal(
            await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
            false,
        );
    });
    test(`a queued registration refresh lets the student continue to the saved destination at ${width}px`, async (t) => {
        const { page, state } = await fixture(t, width);
        await page.goto(client + "/loading?returnTo=%2Fprofile%3Ftab%3Dcourses%23history");
        await page.getByRole("heading", { name: "Refreshing your courses" }).waitFor();
        await page.getByRole("link", { name: "Continue with saved courses" }).click();
        await page.waitForURL("**/profile?tab=courses#history");
        await page.getByRole("button", { name: "Refresh registered courses" }).waitFor();
        assert.equal(state.status, "queued");
        assert.equal(state.submits, 1);
    });
    test(`course editing waits for persistence and preserves failed edits at ${width}px`, async (t) => {
        const { page, state } = await fixture(t, width, true);
        await page.goto(admin + "/admin/courses");
        await page.getByTitle("Edit course code and name").first().click();
        const editName = page.locator('input[value="Original course"]');
        await editName.fill("Saved name");
        await page.getByTitle("Save", { exact: true }).click();
        await page.getByText("Saving course and its references…", { exact: true }).waitFor();
        assert.equal(await page.getByTitle("Save", { exact: true }).isDisabled(), true);
        state.status = "failed";
        await page.getByRole("alert").waitFor();
        assert.equal(await page.locator('input[value="Saved name"]').inputValue(), "Saved name");
        state.status = "completed";
        await page.getByTitle("Save", { exact: true }).click();
        await page.getByText("CS102", { exact: true }).waitFor();
        assert.equal(await page.getByTitle("Save", { exact: true }).count(), 0);
    });
}

for (const [route, resource] of [
    ["students", "/api/student/all"],
    ["courses", "/api/admin/dbcourses"],
]) {
    test(`administrator ${route} restores its session and loads the list once`, async (t) => {
        const { page, requests, origin } = await fixture(t, 1440, true);
        await page.goto(`${origin}/admin/${route}`, { waitUntil: "networkidle" });
        assert.equal(requests.filter((request) => request.path === "/api/admin/").length, 1);
        assert.equal(requests.filter((request) => request.path === resource).length, 1);
    });
}
