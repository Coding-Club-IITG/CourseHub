import assert from "node:assert/strict";
import { before, after, test } from "node:test";
import { chromium } from "playwright";
import fs from "node:fs/promises";
import { contentWorkflowFixture } from "./support/content-workflows.js";
import { linkingOperation } from "../fixtures/linking.js";
let browser;
before(async () => {
    browser = await chromium.launch({
        executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
    });
});
after(async () => browser?.close());
async function fixture(t, width) {
    const f = await contentWorkflowFixture(browser, { width });
    t.after(async () => {
        await f.context.close();
        assert.deepEqual(f.errors, []);
    });
    return f;
}
async function capture(page, name) {
    if (!process.env.BROWSER_ARTIFACT_DIR) return;
    await fs.mkdir(process.env.BROWSER_ARTIFACT_DIR, { recursive: true });
    await page.screenshot({
        path: process.env.BROWSER_ARTIFACT_DIR + "/" + name + ".png",
        fullPage: true,
        animations: "disabled",
    });
}
for (const width of [320, 390, 768, 1024, 1440])
    test(`shared cleanup confirms impact and preserves retry results at ${width}px`, async (t) => {
        const { page, origin, state } = await fixture(t, width);
        await page.emulateMedia({ reducedMotion: "reduce" });
        await page.goto(origin + "/admin/courses/CS101?source=bookmark#files");
        const opener = page.getByRole("button", { name: "Delete Lecture notes.pdf", exact: true });
        await opener.click();
        const dialog = page.getByRole("alertdialog");
        await dialog.waitFor();
        assert.match(await dialog.innerText(), /CS101, MA101/);
        assert.equal(
            await dialog
                .getByRole("button", { name: "Cancel", exact: true })
                .evaluate((e) => e === document.activeElement),
            true,
        );
        await capture(page, `shared-file-confirm-${width}`);
        await page.keyboard.press("Escape");
        await dialog.waitFor({ state: "hidden" });
        await page.waitForFunction(
            () => document.activeElement?.getAttribute("aria-label") === "Delete Lecture notes.pdf",
        );
        await opener.click();
        state.failAction = true;
        await dialog.getByRole("button", { name: "Delete", exact: true }).click();
        await dialog.getByRole("alert").waitFor();
        assert.match(await dialog.innerText(), /no longer permitted/);
        await capture(page, `shared-file-denied-${width}`);
        state.failAction = false;
        await dialog.getByRole("button", { name: "Delete", exact: true }).click();
        await dialog.waitFor({ state: "hidden" });
        await page
            .getByText("Cleanup is in progress. You can leave this page.", { exact: true })
            .waitFor();
        assert.equal(state.actions.length, 2);
        assert.deepEqual(state.actions[1].affectedCourses, ["CS101", "MA101"]);
        assert.equal(new URL(page.url()).hash, "#files");
        assert.equal(new URL(page.url()).searchParams.get("source"), "bookmark");
        await page.reload();
        await page
            .getByText("Cleanup is in progress. You can leave this page.", { exact: true })
            .waitFor();
        state.operation = {
            ...state.operation,
            status: "failed",
            canRetry: true,
            error: { message: "Cleanup needs a retry." },
        };
        await page.getByRole("button", { name: "Retry unfinished work" }).waitFor();
        state.failRetry = true;
        await page.getByRole("button", { name: "Retry unfinished work" }).click();
        await page.getByText("Retry could not be scheduled.", { exact: true }).waitFor();
        state.failRetry = false;
        await page.getByRole("button", { name: "Retry unfinished work" }).click();
        await page.getByText("Cleanup completed", { exact: true }).waitFor();
        assert.equal(state.actions.length, 2);
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    });
test("shared folder removal explains unlinking and moderation keeps failed approval reviewable", async (t) => {
    const { page, origin, state } = await fixture(t, 390);
    await page.goto(origin + "/admin/courses/CS101");
    await page.getByRole("button", { name: "Delete 2026", exact: true }).click();
    const dialog = page.getByRole("alertdialog");
    assert.match(await dialog.innerText(), /unlinked from CS101/);
    assert.match(await dialog.innerText(), /Other linked courses keep/);
    await capture(page, "shared-folder-unlink-390");
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Approve", exact: true }).click();
    state.failAction = true;
    await dialog.getByRole("button", { name: "Approve", exact: true }).click();
    await dialog.getByRole("alert").waitFor();
    assert.equal(state.approved, false);
    state.failAction = false;
    await dialog.getByRole("button", { name: "Approve", exact: true }).click();
    await page.getByText("You're all caught up", { exact: true }).waitFor();
    await page.getByText("Contribution approved.", { exact: true }).waitFor();
});
test("dashboard controls follow returned capabilities", async (t) => {
    const { page, origin, state } = await fixture(t, 320);
    state.capable = false;
    await page.goto(origin + "/admin/courses/CS101");
    await page.getByText("Shared pending notes.pdf", { exact: false }).waitFor();
    assert.equal(await page.getByRole("button", { name: /Delete|Approve|Reject/ }).count(), 0);
});
test("bulk linking restores scheduling receipt, preserves conflicts and recovers from a status outage", async (t) => {
    const { page, origin, state } = await fixture(t, 390);
    state.receipt.batchLinking.scheduled = 2;
    state.receipt.batchLinking.operations.push({ ...state.receipt.batchLinking.operations[0] });
    await page.goto(origin + "/admin/course-linking?from=bookmark#links");
    await page.getByRole("button", { name: "Bulk Link (CSV)" }).click();
    await page.getByLabel("CSV file", { exact: true }).setInputFiles({
        name: "links.csv",
        mimeType: "text/csv",
        buffer: Buffer.from("CS101,CS201\nMISSING,CS201\n"),
    });
    await page.getByRole("button", { name: "Upload and Link" }).click();
    await page.getByText("2 scheduled · 1 could not be scheduled", { exact: true }).waitFor();
    await page
        .getByText("Linking is in progress. You can leave this page.", { exact: true })
        .waitFor();
    await page.reload();
    await page.getByText("2 scheduled · 1 could not be scheduled", { exact: true }).waitFor();
    assert.equal(
        await page.getByLabel("Scheduled link", { exact: true }).locator("option").count(),
        1,
    );
    state.failStatus = true;
    await page.getByRole("alert").waitFor();
    assert.ok(
        await page.getByText("1 year conflict - content preserved", { exact: true }).isVisible(),
    );
    await capture(page, "bulk-receipt-status-error-390");
    state.failStatus = false;
    state.job = linkingOperation();
    await page.getByRole("button", { name: "Try again", exact: true }).click();
    await page.getByText("Linking completed", { exact: true }).waitFor();
    await page.reload();
    await page.getByText("Linking completed", { exact: true }).waitFor();
    assert.equal(new URL(page.url()).hash, "#links");
    assert.equal(new URL(page.url()).searchParams.get("from"), "bookmark");
    await capture(page, "bulk-receipt-completed-390");
});

for (const width of [320, 1440])
    test(`deep named folders wrap and keep keyboard controls reachable at ${width}px`, async (t) => {
        const { page, origin, state } = await fixture(t, width);
        state.deep = true;
        await page.goto(origin + "/admin/courses/CS101");
        await page.getByRole("button", { name: "Collapse Nested lecture material 9" }).waitFor();
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
        await capture(page, `deep-folders-${width}`);
        const top = page.getByRole("button", { name: "Collapse Nested lecture material 9" });
        await top.focus();
        await page.keyboard.press("Enter");
        assert.equal(
            await page.getByRole("button", { name: "Collapse Nested lecture material 8" }).count(),
            0,
        );
        await page.getByRole("button", { name: "Expand Nested lecture material 9" }).click();
        assert.ok(
            await page
                .getByRole("button", { name: "Collapse Nested lecture material 8" })
                .isVisible(),
        );
    });
test("moderation confirmation guards dismissal and repeated submission while pending", async (t) => {
    const { page, origin, state } = await fixture(t, 390);
    await page.goto(origin + "/admin/courses/CS101");
    await page.getByRole("button", { name: "Approve", exact: true }).click();
    let release;
    state.holdAction = new Promise((resolve) => (release = resolve));
    t.after(() => release());
    const dialog = page.getByRole("alertdialog");
    await dialog.getByRole("button", { name: "Approve", exact: true }).click();
    await dialog.getByRole("button", { name: "Working…", exact: true }).waitFor();
    await page.keyboard.press("Escape");
    assert.ok(await dialog.isVisible());
    assert.ok(await dialog.getByRole("button", { name: "Cancel", exact: true }).isDisabled());
    assert.equal(
        await page.locator("body").evaluate((e) => getComputedStyle(e).overflow),
        "hidden",
    );
    await capture(page, "approval-pending-390");
    release();
    await dialog.waitFor({ state: "hidden" });
    assert.equal(state.actions.length, 1);
});
test("academic refresh labels planned counts until persisted work completes", async (t) => {
    const { page, origin, state } = await fixture(t, 390);
    state.operation = {
        ...state.operation,
        kind: "academic-sync",
        name: "Academic course refresh",
        status: "failed",
        canRetry: true,
        synchronization: {
            students: 3,
            allotments: 12,
            createdCourses: 2,
            message: "Courses synchronized successfully.",
        },
        error: { message: "Registration source is unavailable." },
    };
    await page.goto(
        origin + "/admin/operations?status=failed&operation=" + state.operation.id + "#status",
    );
    await page
        .getByText("Planned: 3 students · 12 academic allotments · 2 new courses.", { exact: true })
        .waitFor();
    assert.equal(
        await page.getByText("Courses synchronized successfully.", { exact: true }).count(),
        0,
    );
    await capture(page, "academic-refresh-failed-390");
    await page.getByRole("button", { name: "Retry unfinished work" }).click();
    await page
        .getByText("Updated: 3 students · 12 academic allotments · 2 new courses.", { exact: true })
        .waitFor();
    assert.equal(new URL(page.url()).hash, "#status");
    await capture(page, "academic-refresh-completed-390");
});
