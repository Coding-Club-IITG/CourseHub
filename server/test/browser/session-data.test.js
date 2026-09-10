import assert from "node:assert/strict";
import { before, after, test } from "node:test";
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || "playwright");
const origin = process.env.BROWSER_ADMIN_ORIGIN || "http://127.0.0.1:5174";
let browser;
before(async () => {
    browser = await chromium.launch({
        headless: true,
        executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
    });
});
after(async () => browser?.close());
async function fixture(t, width = 1440) {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    const page = await context.newPage();
    const state = {
        sessionStatus: 200,
        listStatus: 200,
        courses: [{ code: "CS101", name: "Test course" }],
    };
    const requests = [],
        errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await context.route("**/api/**", async (route) => {
        const url = new URL(route.request().url());
        requests.push(url.pathname);
        let status = 200,
            data = {};
        if (url.pathname === "/api/admin/") {
            status = state.sessionStatus;
            data =
                status === 200
                    ? { user: { userId: "test-admin" }, csrfToken: "c".repeat(43) }
                    : { message: "Session service unavailable" };
        } else if (url.pathname === "/api/admin/dbcourses") {
            status = state.listStatus;
            data =
                status === 200
                    ? Array.isArray(state.courses)
                        ? {
                              items: state.courses,
                              page: 1,
                              pageSize: 20,
                              total: state.courses.length,
                          }
                        : state.courses
                    : {
                          code: "TEST_ERROR",
                          message: "Course service unavailable",
                          requestId: "test-request",
                      };
        } else if (url.pathname === "/api/student/all")
            data = { items: [], page: 1, pageSize: 20, total: 0 };
        else if (url.pathname === "/api/operations") data = { items: [] };
        await route
            .fulfill({ status, contentType: "application/json", body: JSON.stringify(data) })
            .catch(() => {});
    });
    t.after(async () => {
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
    return { page, state, requests };
}
for (const width of [1440, 390]) {
    test(`admin session outage retains the full destination and retries at ${width}px`, async (t) => {
        const { page, state, requests } = await fixture(t, width);
        state.sessionStatus = 503;
        await page.goto(origin + "/admin/courses?filter=CS#list");
        await page.getByRole("alert").waitFor();
        assert.equal(requests.includes("/api/admin/dbcourses"), false);
        assert.equal(new URL(page.url()).search + new URL(page.url()).hash, "?filter=CS#list");
        state.sessionStatus = 200;
        await page.getByRole("button", { name: "Try again" }).click();
        await page.getByText("Test course", { exact: true }).waitFor();
    });
    test(`admin course failure is visible and retries to a valid empty list at ${width}px`, async (t) => {
        const { page, state } = await fixture(t, width);
        state.listStatus = 500;
        await page.goto(origin + "/admin/courses");
        await page.getByRole("alert").filter({ hasText: "We couldn’t load courses" }).waitFor();
        assert.equal(new URL(page.url()).pathname, "/admin/courses");
        state.listStatus = 200;
        state.courses = [];
        await page.getByRole("button", { name: "Try again" }).click();
        await page.getByText("No courses found", { exact: false }).waitFor();
        assert.equal(await page.getByRole("alert").count(), 0);
    });
}
test("admin 403 and malformed list responses stay visible, and 401 restores the login destination", async (t) => {
    const { page, state } = await fixture(t);
    state.listStatus = 403;
    await page.goto(origin + "/admin/courses?sort=name#content");
    await page.getByRole("alert").waitFor();
    state.listStatus = 200;
    state.courses = { unexpected: true };
    await page.getByRole("button", { name: "Try again" }).click();
    await page
        .getByText("The course list could not be read. Please try again.", { exact: true })
        .waitFor();
    state.listStatus = 401;
    await page.getByRole("button", { name: "Try again" }).click();
    await page.waitForURL("**/admin/login?returnTo=*");
    assert.equal(
        new URL(page.url()).searchParams.get("returnTo"),
        "/admin/courses?sort=name#content",
    );
});
test("admin navigation reuses its confirmed session", async (t) => {
    const { page, requests } = await fixture(t);
    await page.goto(origin + "/admin/courses");
    await page.getByText("Test course", { exact: true }).waitFor();
    await page.getByRole("link", { name: "Students", exact: true }).click();
    await page.getByRole("textbox", { name: "Search students" }).waitFor();
    assert.equal(requests.filter((item) => item === "/api/admin/").length, 1);
});
