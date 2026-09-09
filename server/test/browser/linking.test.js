import assert from "node:assert/strict";
import { before, after, test } from "node:test";
import { createRequire } from "node:module";
import fs from "node:fs/promises";
import path from "node:path";
import { linkingOperation } from "../fixtures/linking.js";

const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || "playwright");
const origin = process.env.BROWSER_ADMIN_ORIGIN || "http://127.0.0.1:4184";
let browser;
before(async () => {
    browser = await chromium.launch({
        headless: true,
        executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
    });
});
after(() => browser?.close());
async function fixture(t, width, status = "completed") {
    const context = await browser.newContext({
        viewport: { width, height: 900 },
        timezoneId: "Asia/Kolkata",
        locale: "en-US",
    });
    await context.addCookies([{ name: "adminToken", value: "synthetic-session", url: origin }]);
    const page = await context.newPage();
    page.setDefaultTimeout(10000);
    await page.clock.setFixedTime(new Date("2026-09-09T06:30:00Z"));
    const errors = [],
        requests = [],
        state = { operation: linkingOperation(status) };
    page.on("pageerror", (error) => errors.push(error.message));
    t.after(async () => {
        if (process.env.BROWSER_ARTIFACT_DIR) {
            await fs.mkdir(process.env.BROWSER_ARTIFACT_DIR, { recursive: true });
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
        }
        await context.close();
        assert.deepEqual(errors, []);
    });
    await context.route("**/*", async (route) => {
        const request = route.request(),
            url = new URL(request.url());
        if (url.origin !== origin) return route.abort();
        if (!url.pathname.startsWith("/api/")) return route.continue();
        const headers = await request.allHeaders();
        requests.push({ path: url.pathname, headers, method: request.method() });
        let data = {},
            status = 200;
        if (url.pathname === "/api/admin/") data = { user: { userId: "audit-admin" } };
        else if (url.pathname === "/api/auth/csrf") data = { csrfToken: "c".repeat(43) };
        else if (url.pathname === "/api/operations")
            data = { items: [state.operation], page: 1, pageSize: 20, total: 1 };
        else if (url.pathname.endsWith("/retry")) {
            state.operation = linkingOperation("completed");
            status = 202;
            data = state.operation;
        } else if (url.pathname.startsWith("/api/operations/")) data = state.operation;
        else if (url.pathname.endsWith("/link") || url.pathname.endsWith("/bulk-link")) {
            assert.equal(headers["x-csrf-token"], "c".repeat(43));
            assert.ok(headers.cookie.includes("adminToken"));
            const accepted = { operationId: state.operation.id, kind: "link", status: "queued" };
            status = 202;
            data = url.pathname.endsWith("/bulk-link")
                ? {
                      summary: {
                          scheduled: 1,
                          failed: 0,
                          errors: [],
                          operations: [{ oldCode: "CS101", newCode: "CS201", ...accepted }],
                      },
                  }
                : accepted;
        } else status = 404;
        await route.fulfill({
            status,
            contentType: "application/json",
            body: JSON.stringify(data),
        });
    });
    return { page, state, requests };
}
async function capture(page, name) {
    if (!process.env.BROWSER_ARTIFACT_DIR) return;
    await fs.mkdir(process.env.BROWSER_ARTIFACT_DIR, { recursive: true });
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({
        path: path.join(process.env.BROWSER_ARTIFACT_DIR, name + ".png"),
        fullPage: true,
    });
}
async function manual(page) {
    await page.goto(origin + "/admin/course-linking");
    await page.getByPlaceholder("e.g., CS101", { exact: true }).fill("CS101");
    await page.getByPlaceholder("e.g., CSN101", { exact: true }).fill("CS201");
    await page.getByRole("button", { name: "Link Course", exact: true }).click();
}
for (const width of [320, 390, 768, 1024, 1440]) {
    test(`manual linking waits for completion and reports preserved conflicts at ${width}px`, async (t) => {
        const { page, state } = await fixture(t, width, "running");
        await manual(page);
        await page
            .getByText("Linking is in progress. You can leave this page.", { exact: true })
            .waitFor();
        assert.equal(await page.getByText("Linking completed", { exact: true }).count(), 0);
        assert.equal(
            await page.getByPlaceholder("e.g., CS101", { exact: true }).isDisabled(),
            true,
        );
        if ([390, 1440].includes(width)) await capture(page, `link-running-${width}`);
        state.operation = linkingOperation();
        await page.getByText("Linking completed", { exact: true }).waitFor();
        await page.getByText("1 year conflict - content preserved", { exact: true }).waitFor();
        assert.ok(
            await page
                .getByText(/Linked: 1 year. Already linked: 1. Empty replacements: 1./)
                .isVisible(),
        );
        await capture(page, `manual-conflict-${width}`);
    });
    test(`bulk linking reports completed work and its conflicts at ${width}px`, async (t) => {
        const { page } = await fixture(t, width);
        await page.goto(origin + "/admin/course-linking");
        await page.getByRole("button", { name: "Bulk Link (CSV)", exact: true }).click();
        await page.locator("input[type=file]").setInputFiles({
            name: "links.csv",
            mimeType: "text/csv",
            buffer: Buffer.from("CS101,CS201\n"),
        });
        await page.getByRole("button", { name: "Upload and Link", exact: true }).click();
        await page.getByText("1 year conflict - content preserved", { exact: true }).waitFor();
        await capture(page, `bulk-conflict-${width}`);
    });
    test(`operation review retains the linking plan through retry at ${width}px`, async (t) => {
        const { page, requests } = await fixture(t, width, "failed");
        await page.goto(origin + "/admin/operations");
        await page.getByText("1 year conflict - content preserved", { exact: true }).waitFor();
        await capture(page, `link-failed-${width}`);
        await page.getByRole("button", { name: "Retry unfinished work", exact: true }).click();
        await page.locator("li span").getByText("completed", { exact: true }).waitFor();
        await capture(page, `link-completed-${width}`);
        assert.ok(
            requests.some(
                (request) => request.path.endsWith("/retry") && request.headers["x-csrf-token"],
            ),
        );
        assert.equal(await page.getByText(/files uploaded/).count(), 0);
        const metrics = await page.evaluate(() => ({
            width: innerWidth,
            scroll: document.documentElement.scrollWidth,
        }));
        assert.ok(metrics.scroll <= metrics.width + 1, JSON.stringify(metrics));
    });
}
test("failed linking retains the requested course codes and offers operation recovery", async (t) => {
    const { page, state } = await fixture(t, 390, "failed");
    await manual(page);
    await page
        .getByText("Linking could not finish. Retry preserves the saved plan.", { exact: true })
        .waitFor();
    assert.equal(await page.getByPlaceholder("e.g., CS101", { exact: true }).inputValue(), "CS101");
    assert.equal(
        await page.getByPlaceholder("e.g., CSN101", { exact: true }).inputValue(),
        "CS201",
    );
    await capture(page, "manual-failed-390");
    state.operation = linkingOperation();
    await page.getByRole("button", { name: "Link Course", exact: true }).click();
    await page.getByText("Linking completed", { exact: true }).waitFor();
});
