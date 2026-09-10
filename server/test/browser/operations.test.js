import assert from "node:assert/strict";
import { test, before, after } from "node:test";
import { createRequire } from "node:module";
import fs from "node:fs/promises";
import path from "node:path";
import { student, course, folder } from "../fixtures/library.js";
import { uploadOperation, deletionOperation } from "../fixtures/operations.js";
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || "playwright");
const frontend = process.env.BROWSER_CLIENT_ORIGIN || "http://127.0.0.1:4186";
const adminOrigin = process.env.BROWSER_ADMIN_ORIGIN || "http://127.0.0.1:4184";
const api = process.env.BROWSER_API_ORIGIN || "http://127.0.0.1:4185";
const csrf = "c".repeat(43);
let browser;
before(async () => {
    browser = await chromium.launch({
        headless: true,
        executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
    });
});
after(() => browser?.close());

async function pageFor(t, width, { admin = false, resumed = true, manager = false } = {}) {
    const presentedFolder = manager
        ? { ...folder, capabilities: { ...folder.capabilities, canManage: true } }
        : folder;
    const context = await browser.newContext({
        viewport: { width, height: 900 },
        locale: "en-US",
        timezoneId: "Asia/Kolkata",
        serviceWorkers: "block",
    });
    await context.addCookies([
        {
            name: admin ? "adminToken" : "token",
            value: "synthetic-session",
            url: admin ? adminOrigin : api,
            httpOnly: true,
            sameSite: "Lax",
        },
    ]);
    const page = await context.newPage();
    await page.clock.install({ time: new Date("2026-09-08T06:30:00Z") });
    const errors = [],
        requests = [];
    const state = {
        operation: admin ? deletionOperation() : resumed ? uploadOperation() : null,
        failStatus: false,
        uploadCalls: [],
        retryCalls: 0,
    };
    if (manager) {
        state.operation.canCancel = false;
        state.operation.canRetry = false;
    }
    page.on("pageerror", (error) => errors.push(error.message));
    t.after(async () => {
        if (process.env.BROWSER_ARTIFACT_DIR)
            await fs.writeFile(
                path.join(
                    process.env.BROWSER_ARTIFACT_DIR,
                    t.name.replace(/[^a-z0-9]+/gi, "-") + ".json",
                ),
                JSON.stringify(
                    { text: await page.locator("body").innerText(), requests, errors },
                    null,
                    2,
                ),
            );
        await context.close();
        assert.deepEqual(errors, []);
    });
    await context.route("**/*", async (route) => {
        const req = route.request(),
            url = new URL(req.url());
        if ([frontend, adminOrigin].includes(url.origin) && !url.pathname.startsWith("/api/"))
            return route.continue();
        if (![api, adminOrigin].includes(url.origin)) return route.abort();
        const headers = await req.allHeaders();
        requests.push({ path: url.pathname, method: req.method(), headers, body: req.postData() });
        let data = {},
            status = 200;
        if (url.pathname === "/api/user")
            data = {
                ...student,
                isBR: manager,
                capabilities: {
                    ...student.capabilities,
                    canManageCourses: manager ? ["CS101"] : [],
                },
                csrfToken: csrf,
            };
        else if (url.pathname === "/api/admin/") data = { user: { userId: "audit-admin" } };
        else if (url.pathname === "/api/auth/csrf") data = { csrfToken: csrf };
        else if (url.pathname === "/api/course/CS101")
            data = {
                found: true,
                ...course,
                children: course.children.map((year) => ({ ...year, children: [presentedFolder] })),
            };
        else if (url.pathname === "/api/admin/course/cs101/dashboard")
            data = {
                course: { ...course, capabilities: { canManage: true, canModerate: true } },
                studentCount: 24,
                contributions: [
                    {
                        contributionId: "shared-review",
                        approved: false,
                        files: [
                            {
                                name: "Shared lecture notes.pdf",
                                affectedCourses: ["CS101", "MA101"],
                            },
                        ],
                    },
                ],
            };
        else if (url.pathname === "/api/admin/contribution/action") {
            const body = JSON.parse(req.postData());
            assert.deepEqual(body.affectedCourses, ["CS101", "MA101"]);
            state.operation = deletionOperation("queued");
            status = 202;
            data = { operationId: state.operation.id };
        } else if (url.pathname.startsWith("/api/folder/content/")) data = presentedFolder;
        else if (url.pathname === "/api/contribution/limits") {
            if (state.holdLimits) await state.holdLimits;
            status = state.limitsFail ? 503 : 200;
            data = state.limitsFail
                ? { message: "Upload limits are unavailable" }
                : { files: 40, fileBytes: 104857600, batchBytes: 1073741824, concurrentFiles: 2 };
        } else if (url.pathname === "/api/contribution/") {
            if (req.method() === "POST") {
                status = 201;
                state.operation = uploadOperation("awaiting");
                state.operation.entries = JSON.parse(req.postData()).manifest.map(
                    (file, index) => ({
                        ...file,
                        id: `file-${index}`,
                        state: "pending",
                        uploadedBytes: 0,
                    }),
                );
                data = state.operation;
            } else data = [];
        } else if (url.pathname === "/api/operations") {
            if (state.holdListings) await state.holdListings;
            data = {
                items: state.operation ? [state.operation] : [],
                total: state.operation ? 1 : 0,
                page: 1,
                pageSize: 20,
            };
            if (state.failStatus) {
                status = 503;
                data = { message: "Status is temporarily unavailable" };
            }
        } else if (url.pathname.endsWith("/retry")) {
            assert.equal(headers["x-csrf-token"], csrf);
            state.retryCalls++;
            status = 202;
            if (admin) state.operation = deletionOperation("queued");
            else {
                state.operation.status = "awaiting";
                state.operation.entries.forEach((entry) => {
                    if (entry.state === "failed") entry.state = "pending";
                });
            }
            data = state.operation;
        } else if (url.pathname.endsWith("/cancel")) {
            assert.equal(headers["x-csrf-token"], csrf);
            status = 202;
            state.operation.status = "cancelled";
            state.operation.canCancel = false;
            state.operation.entries.forEach((entry) => {
                if (entry.state !== "completed") entry.state = "cancelled";
            });
            data = state.operation;
        } else if (url.pathname.startsWith("/api/operations/")) {
            status = state.failPoll ? 503 : 200;
            data = state.failPoll
                ? { message: "Status is temporarily unavailable" }
                : state.operation;
        } else if (url.pathname === "/api/contribution/upload") {
            assert.ok(headers.cookie?.includes("token=synthetic-session"));
            assert.equal(headers["x-csrf-token"], csrf);
            const entry = state.operation.entries.find(
                (entry) => entry.id === headers["upload-file-id"],
            );
            assert.ok(entry);
            state.uploadCalls.push(entry.id);
            entry.state = "completed";
            entry.uploadedBytes = entry.size;
            delete entry.error;
            state.operation.status = state.operation.entries.every(
                (file) => file.state === "completed",
            )
                ? "completed"
                : "awaiting";
            state.operation.canCancel = state.operation.status !== "completed";
            status = 202;
            data = { operationId: state.operation.id };
        } else if (url.pathname === "/api/contribution/br") data = { unverifiedContributions: [] };
        else {
            status = 404;
            data = { message: "Fixture resource is unavailable" };
        }
        await route
            .fulfill({
                status,
                contentType: "application/json",
                headers: {
                    "access-control-allow-origin": admin ? adminOrigin : frontend,
                    "access-control-allow-credentials": "true",
                },
                body: JSON.stringify(data),
            })
            .catch(() => {});
    });
    return { page, state, requests };
}

async function capture(page, name) {
    if (!process.env.BROWSER_ARTIFACT_DIR) return;
    await fs.mkdir(process.env.BROWSER_ARTIFACT_DIR, { recursive: true });
    await page.screenshot({
        path: path.join(process.env.BROWSER_ARTIFACT_DIR, name + ".png"),
        fullPage: true,
        animations: "disabled",
    });
}

for (const width of [320, 390, 768, 1024, 1440]) {
    test(`resumed upload retains successful files and retries only the selected failed file at ${width}px`, async (t) => {
        const { page, state } = await pageFor(t, width);
        await page.goto(`${frontend}/browse/CS101/${folder._id}?upload=${state.operation.id}`);
        await page.getByText("1 of 2 files uploaded", { exact: true }).waitFor();
        await capture(page, `upload-partial-${width}`);
        const metrics = await page.evaluate(() => ({
            viewport: innerWidth,
            content: document.documentElement.scrollWidth,
        }));
        assert.ok(metrics.content <= metrics.viewport + 1, JSON.stringify(metrics));
        const failed = state.operation.entries[1];
        await page.locator(".filepond--browser").setInputFiles({
            name: failed.name,
            mimeType: "application/pdf",
            buffer: Buffer.from("12345"),
        });
        const button = page.getByRole("button", { name: "Retry failed files", exact: true });
        await page.waitForFunction(
            () =>
                document.querySelector(
                    '[data-upload-dialog] [data-ui-dialog-footer] button[data-variant="primary"]',
                )?.disabled === false,
        );
        // Closing details retains the selected File object for a failed-file-only retry.
        await page.getByRole("button", { name: "Close", exact: true }).click();
        await page.getByRole("link", { name: "View upload" }).click();
        await page.waitForFunction(
            () =>
                document.querySelector(
                    '[data-upload-dialog] [data-ui-dialog-footer] button[data-variant="primary"]',
                )?.disabled === false,
        );
        await button.focus();
        await page.keyboard.press("Enter");
        await page.getByText("2 of 2 files uploaded", { exact: true }).waitFor();
        await page.getByRole("button", { name: "Close", exact: true }).waitFor();
        assert.equal(state.retryCalls, 1);
        assert.deepEqual(state.uploadCalls, [failed.id]);
        await capture(page, `upload-completed-${width}`);
    });
    test(`administrator reviews failed cleanup and retries persisted work at ${width}px`, async (t) => {
        const { page, state, requests } = await pageFor(t, width, { admin: true });
        await page.goto(adminOrigin + "/admin/operations");
        await page
            .getByText("Thumbnail cleanup could not finish. Completed steps are preserved.")
            .waitFor();
        await capture(page, `admin-operations-failed-${width}`);
        await page.getByRole("button", { name: "Retry unfinished work" }).click();
        await page.getByRole("article").getByText("queued", { exact: true }).waitFor();
        state.operation = deletionOperation("completed");
        await page.getByRole("button", { name: "Refresh", exact: true }).click();
        await page.getByRole("article").getByText("completed", { exact: true }).waitFor();
        assert.equal(state.retryCalls, 1);
        assert.ok(
            requests.some(
                (request) =>
                    request.path.endsWith("/retry") &&
                    request.headers["x-session-role"] === "admin",
            ),
        );
        assert.equal(await page.getByRole("button", { name: "Retry unfinished work" }).count(), 0);
        const metrics = await page.evaluate(() => ({
            viewport: innerWidth,
            content: document.documentElement.scrollWidth,
        }));
        assert.ok(metrics.content <= metrics.viewport + 1, JSON.stringify(metrics));
    });
}
for (const width of [390, 1440]) {
    test(`operation loading and valid empty results remain distinct at ${width}px`, async (t) => {
        const { page, state } = await pageFor(t, width, { admin: true });
        let release;
        state.holdListings = new Promise((resolve) => {
            release = resolve;
        });
        await page.goto(adminOrigin + "/admin/operations");
        await page.getByText("Loading operations…", { exact: true }).waitFor();
        await capture(page, `admin-operations-loading-${width}`);
        state.operation = null;
        release();
        await page.getByText("No operations match this status", { exact: true }).waitFor();
        await capture(page, `admin-operations-empty-${width}`);
    });
    test(`upload limits failure is recoverable without losing the resumed batch at ${width}px`, async (t) => {
        const { page, state } = await pageFor(t, width);
        state.limitsFail = true;
        await page.goto(`${frontend}/browse/CS101/${folder._id}?upload=${state.operation.id}`);
        await page
            .getByRole("alert")
            .filter({ hasText: "Upload limits are unavailable." })
            .waitFor();
        await capture(page, `upload-limits-error-${width}`);
        state.limitsFail = false;
        await page.getByRole("button", { name: "Retry upload limits" }).click();
        await page
            .getByRole("button", { name: "Retry upload limits" })
            .waitFor({ state: "hidden" });
        assert.ok(await page.getByText("1 of 2 files uploaded", { exact: true }).isVisible());
    });
    test(`server upload progress remains visible and cancellation can be requested at ${width}px`, async (t) => {
        const { page, state } = await pageFor(t, width);
        state.operation.status = "running";
        state.operation.entries[1].state = "uploading";
        state.operation.entries[1].uploadedBytes = 2;
        delete state.operation.entries[1].error;
        await page.goto(`${frontend}/browse/CS101/${folder._id}?upload=${state.operation.id}`);
        await page.getByRole("progressbar").waitFor();
        await capture(page, `upload-progress-${width}`);
        await page.getByRole("button", { name: "Cancel remaining uploads" }).click();
        await page
            .locator("[data-upload-results]")
            .getByText("Cancelled", { exact: true })
            .waitFor();
        assert.equal(state.operation.entries[0].state, "completed");
    });
}

test("a course manager can inspect another uploader's results without resuming or cancelling their batch", async (t) => {
    const { page, state } = await pageFor(t, 390, { manager: true });
    await page.goto(`${frontend}/browse/CS101/${folder._id}?upload=${state.operation.id}`);
    await page.getByText("1 of 2 files uploaded", { exact: true }).waitFor();
    assert.equal(
        await page.getByRole("button", { name: "Retry failed files", exact: true }).count(),
        0,
    );
    assert.equal(
        await page.getByRole("button", { name: "Cancel remaining uploads", exact: true }).count(),
        0,
    );
    assert.equal(await page.locator(".filepond--browser").count(), 0);
    await capture(page, "upload-manager-review-390");
});

test("cancelling a resumed partial batch keeps successful results visible", async (t) => {
    const { page, state } = await pageFor(t, 390);
    await page.goto(`${frontend}/browse/CS101/${folder._id}?upload=${state.operation.id}`);
    await page.getByRole("button", { name: "Cancel remaining uploads" }).click();
    await page.locator("[data-upload-results]").getByText("Cancelled", { exact: true }).waitFor();
    assert.equal(state.operation.entries[0].state, "completed");
    await page.getByText("1 of 2 files uploaded", { exact: true }).waitFor();
    await capture(page, "upload-cancelled-390");
});
test("shared contribution rejection confirms affected courses and waits for actual cleanup completion", async (t) => {
    const { page, state } = await pageFor(t, 1440, { admin: true });
    await page.goto(adminOrigin + "/admin/courses/CS101");
    await page.getByRole("button", { name: "Reject", exact: true }).click();
    const dialog = page.getByRole("alertdialog");
    await dialog.waitFor();
    assert.match(await dialog.innerText(), /CS101, MA101/);
    await dialog.getByRole("button", { name: "Reject", exact: true }).click();
    await dialog.waitFor({ state: "hidden" });
    await page
        .getByText("Cleanup is in progress. You can leave this page.", { exact: true })
        .waitFor();
    assert.equal(await page.getByText("Cleanup completed", { exact: true }).count(), 0);
    state.operation = deletionOperation("completed");
    await page.getByText("Cleanup completed", { exact: true }).waitFor();
    await page.reload();
    await page.getByText("Cleanup completed", { exact: true }).waitFor();
});
test("administrator status failure preserves the last results and offers an explicit retry", async (t) => {
    const { page, state } = await pageFor(t, 390, { admin: true });
    await page.goto(adminOrigin + "/admin/operations");
    await page
        .getByText("Thumbnail cleanup could not finish. Completed steps are preserved.")
        .waitFor();
    state.failStatus = true;
    await page.getByRole("button", { name: "Refresh", exact: true }).click();
    await page.getByRole("alert").waitFor();
    assert.ok(await page.getByText("Shared lecture notes.pdf", { exact: false }).isVisible());
    await capture(page, "admin-operations-error-390");
    state.failStatus = false;
    await page.getByRole("button", { name: "Refresh", exact: true }).click();
    await page.getByRole("alert").waitFor({ state: "hidden" });
});

for (const width of [320, 390, 768, 1024, 1440]) {
    test(`a 40-file upload scrolls its results while keeping actions reachable at ${width}px`, async (t) => {
        const { page, state } = await pageFor(t, width);
        state.operation.entries = Array.from({ length: 40 }, (_, index) => ({
            ...state.operation.entries[index % 2],
            id: `entry-${index}`,
            name: `Lecture ${index + 1} - Detailed worked examples and revision notes.pdf`,
        }));
        await page.goto(`${frontend}/browse/CS101/${folder._id}?upload=${state.operation.id}`);
        await page.getByText("20 of 40 files uploaded", { exact: true }).waitFor();
        const bounds = await page
            .locator("[data-upload-dialog] [data-ui-dialog-footer]")
            .evaluate((footer) => ({
                footer: footer.getBoundingClientRect().toJSON(),
                width: innerWidth,
                height: innerHeight,
                buttons: [...footer.querySelectorAll("button")].map((button) =>
                    button.getBoundingClientRect().toJSON(),
                ),
            }));
        for (const rect of [bounds.footer, ...bounds.buttons]) {
            assert.ok(rect.left >= 0 && rect.right <= bounds.width, JSON.stringify(bounds));
            assert.ok(rect.top >= 0 && rect.bottom <= bounds.height, JSON.stringify(bounds));
        }
        assert.equal(
            await page.getByRole("complementary", { name: "Content operations" }).isVisible(),
            false,
        );
        await capture(page, `upload-large-${width}`);
        await page.locator("[data-upload-dialog] [data-ui-dialog-body]").evaluate((body) => {
            body.scrollTop = body.scrollHeight;
        });
        await page.getByRole("button", { name: "Cancel remaining uploads" }).click();
        await page.getByRole("button", { name: "Start another batch" }).waitFor();
        assert.equal(state.operation.status, "cancelled");
        assert.equal(
            state.operation.entries.filter((entry) => entry.state === "completed").length,
            20,
        );
    });
}

for (const width of [390, 1440]) {
    test(`a compact notice reopens the same upload without duplicating its controls at ${width}px`, async (t) => {
        const { page, state } = await pageFor(t, width);
        await page.goto(`${frontend}/browse/CS101/${folder._id}?upload=${state.operation.id}`);
        await page.getByText("1 of 2 files uploaded", { exact: true }).waitFor();
        const notice = page.getByRole("complementary", { name: "Content operations" });
        assert.equal(await notice.isVisible(), false);
        await page.getByRole("button", { name: "Close", exact: true }).click();
        await notice.waitFor();
        assert.equal(await notice.locator("li").count(), 0);
        assert.equal(await notice.getByRole("button", { name: /cancel/i }).count(), 0);
        await capture(page, `notice-partial-${width}`);
        await notice.getByRole("link", { name: "View upload" }).click();
        await page.locator("[data-upload-dialog]").waitFor();
        assert.equal(await notice.isVisible(), false);
        await page.getByRole("button", { name: "Cancel remaining uploads" }).click();
        await page.getByRole("button", { name: "Start another batch" }).waitFor();
        assert.equal(state.operation.status, "cancelled");
    });
}

test("upload settings enable the picker after loading without showing a premature retry", async (t) => {
    const { page, state } = await pageFor(t, 390);
    state.operation = uploadOperation("completed");
    let release;
    state.holdLimits = new Promise((resolve) => {
        release = resolve;
    });
    await page.goto(`${frontend}/browse/CS101/${folder._id}?upload=${state.operation.id}`);
    await page.getByRole("button", { name: "Start another batch" }).click();
    await page.getByText("Loading upload settings…", { exact: true }).waitFor();
    assert.equal(await page.getByRole("button", { name: "Retry upload limits" }).count(), 0);
    assert.equal(
        await page.getByRole("button", { name: "Upload files", exact: true }).isDisabled(),
        true,
    );
    await capture(page, "upload-settings-loading-390");
    release();
    await page.getByText("Loading upload settings…", { exact: true }).waitFor({ state: "hidden" });
    assert.equal(await page.locator(".filepond--browser").isDisabled(), false);
    await page.locator(".filepond--browser").setInputFiles({
        name: "Fresh notes.pdf",
        mimeType: "application/pdf",
        buffer: Buffer.from("12345"),
    });
    await page.getByRole("button", { name: "Upload files", exact: true }).click();
    await page.getByText("1 of 1 files uploaded", { exact: true }).waitFor();
    assert.equal(state.uploadCalls.length, 1);
    assert.equal(await page.locator(".Toastify__toast").count(), 0);
});

test("upload status can recover without repeating an error or losing successful files", async (t) => {
    const { page, state } = await pageFor(t, 390);
    state.operation.status = "running";
    state.operation.entries[1].state = "uploading";
    delete state.operation.entries[1].error;
    await page.goto(frontend + "/browse/CS101/" + folder._id + "?upload=" + state.operation.id);
    await page.getByText("1 of 2 files uploaded", { exact: true }).waitFor();
    assert.equal(
        await page.getByRole("button", { name: "Refresh status", exact: true }).count(),
        0,
    );
    state.failPoll = true;
    await page.getByRole("alert").filter({ hasText: "Status could not refresh." }).waitFor();
    assert.ok(await page.getByText("1 of 2 files uploaded", { exact: true }).isVisible());
    state.failPoll = false;
    await page.getByRole("button", { name: "Refresh status", exact: true }).click();
    await page
        .getByRole("button", { name: "Refresh status", exact: true })
        .waitFor({ state: "hidden" });
    assert.ok(await page.getByText("1 of 2 files uploaded", { exact: true }).isVisible());
});
