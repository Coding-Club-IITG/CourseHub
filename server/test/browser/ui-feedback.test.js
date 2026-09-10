import assert from "node:assert/strict";
import { before, after, test } from "node:test";
import { chromium } from "playwright";
import { fileAccessFixture, fileIds } from "./support/file-access.js";
import { studentAdministrationFixture } from "./support/student-administration.js";
import { examFixture } from "./support/exams.js";

let browser;
before(async () => {
    browser = await chromium.launch({
        executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
    });
});
after(async () => browser?.close());
const longName =
    "Lectures and worked examples with detailed solutions and mathematical foundations";

for (const width of [1440, 390]) {
    test(`course search runs as you type, clears results and supports keyboard dismissal at ${width}px`, async (t) => {
        const { page, frontend } = await fileAccessFixture(browser, t, { width });
        const searches = [];
        await page.route("**/api/search", async (route) => {
            searches.push(route.request().postDataJSON());
            await route.fulfill({ json: { results: [{ code: "QA999", name: "Search result" }] } });
        });
        await page.goto(frontend + "/dashboard");
        const input = page.getByRole("textbox", { name: "Search courses", exact: true });
        await input.waitFor();
        assert.equal(
            await page.getByRole("button", { name: "Search courses", exact: true }).count(),
            0,
        );
        assert.equal(await input.locator("..").locator("svg").count(), 1);
        await input.fill("QA999");
        await page.getByRole("link", { name: /QA999/ }).waitFor();
        assert.equal(searches.length, 1);
        await input.press("Escape");
        assert.equal(await page.getByRole("link", { name: /QA999/ }).count(), 0);
        await input.fill("");
        await input.fill("QA");
        await page.getByRole("link", { name: /QA999/ }).waitFor();
        await input.fill("");
        assert.equal(await page.getByRole("link", { name: /QA999/ }).count(), 0);
        await input.fill("QA999");
        await input.press("Tab");
        await page.getByRole("link", { name: /QA999/ }).press("Enter");
        await page.waitForURL("**/browse/QA999");
    });
    test(`administrator row icons retain labelled actions without duplicate Operations shortcuts at ${width}px`, async () => {
        const f = await studentAdministrationFixture(browser, { width });
        try {
            await f.page.goto(f.origin + "/admin/students");
            const row = f.page.getByRole("row").filter({ hasText: "Student 01" });
            await row.waitFor();
            for (const name of ["Details", "Refresh courses", "Delete student", "Remove BR"]) {
                const button = row.getByRole("button", { name, exact: true });
                assert.equal(await button.innerText(), "");
                assert.equal(await button.locator("svg").count(), 1);
            }
            await row.getByRole("button", { name: "Details", exact: true }).press("Enter");
            await row.getByRole("button", { name: "Hide details" }).waitFor();
            if (width === 390)
                await f.page.getByRole("button", { name: "Open navigation" }).click();
            assert.equal(
                await f.page.getByRole("link", { name: "Operations", exact: true }).count(),
                1,
            );
            await f.page.goto(f.origin + "/admin/course-linking");
            await f.page.getByRole("heading", { level: 1 }).waitFor();
            assert.equal(await f.page.getByRole("link", { name: "View in Operations" }).count(), 0);
            assert.deepEqual(f.errors, []);
        } finally {
            await f.context.close();
        }
    });
}

for (const width of [320, 390, 768, 1024, 1440]) {
    test(`long course codes and inline file/folder controls fit at ${width}px`, async (t) => {
        const { page, frontend, state } = await fileAccessFixture(browser, t, {
            width,
            role: "br",
            touch: width <= 768,
        });
        state.name = longName + ".pdf";
        state.folderName = longName;
        await page.goto(`${frontend}/browse/CS101/${fileIds.folder}`);
        const card = page.locator(".file-display").first();
        await card.waitFor();
        await page.mouse.move(0, 0);
        const center = await card.evaluate((node) => {
            const a = node.getBoundingClientRect(),
                b = node.querySelector(".title-text").getBoundingClientRect();
            return Math.abs((a.left + a.right) / 2 - (b.left + b.right) / 2);
        });
        assert.ok(center < 1);
        await card.getByRole("button", { name: "Rename file" }).click();
        assert.equal(await card.getByRole("button", { name: "Rename file" }).count(), 0);
        for (const name of ["Save name", "Cancel"]) {
            const button = card.getByRole("button", { name, exact: true });
            assert.equal(await button.innerText(), "");
            assert.equal(await button.locator("svg").count(), 1);
        }
        await card.getByRole("button", { name: "Cancel", exact: true }).click();
        assert.ok(
            await card
                .getByRole("button", { name: "Rename file" })
                .evaluate((node) => node === document.activeElement),
        );
        await page.getByRole("button", { name: "← Back to 2026", exact: true }).click();
        const folder = page.locator(".browse-folder").first();
        await folder.waitFor();
        assert.equal(await folder.getByText("Shared folder", { exact: true }).count(), 0);
        await folder.getByRole("button", { name: "Rename", exact: true }).click();
        assert.equal(await folder.getByRole("button", { name: "Rename", exact: true }).count(), 0);
        assert.equal(await folder.getByRole("button", { name: /Remove|Delete/ }).count(), 0);
        const fits = await folder.evaluate((node) => {
            const a = node.getBoundingClientRect();
            return [...node.querySelectorAll("input, button:not([hidden])")]
                .filter((n) => n.getClientRects().length)
                .every((n) => {
                    const b = n.getBoundingClientRect();
                    return (
                        b.left >= a.left &&
                        b.right <= a.right &&
                        b.top >= a.top &&
                        b.bottom <= a.bottom
                    );
                });
        });
        assert.ok(fits);
        await page.keyboard.press("Escape");
        if (width > 768) {
            const remove = page.getByRole("button", { name: "Delete year 2026" });
            const year = page.getByRole("button", { name: "2026", exact: true });
            const row = await year.locator("..").boundingBox(),
                bar = await year.boundingBox();
            assert.ok(Math.abs(row.width - bar.width) < 1);
            await remove.focus();
            assert.equal(await remove.evaluate((node) => getComputedStyle(node).opacity), "1");
        }
        await page.goto(frontend + "/dashboard");
        await page.route("**/api/search", (r) =>
            r.fulfill({ json: { results: [{ code: "CS3106L", name: longName }] } }),
        );
        await page.getByRole("button", { name: "Add Course", exact: true }).first().click();
        const dialog = page.getByRole("dialog", { name: "Add New Course" });
        await dialog.getByRole("textbox", { name: "Course code or name" }).fill("CS3106L");
        await dialog.getByRole("button", { name: "Search courses", exact: true }).click();
        const code = dialog.getByText("CS3106L", { exact: true });
        await code.waitFor();
        assert.ok(
            await code.evaluate((node) => {
                const rect = node.getBoundingClientRect(),
                    parent = node.parentElement.getBoundingClientRect();
                return (
                    rect.height < parseFloat(getComputedStyle(node).lineHeight) * 1.5 &&
                    rect.right <= parent.right &&
                    node.scrollWidth <= node.clientWidth
                );
            }),
        );
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    });
}

for (const width of [1440, 390])
    for (const reducedMotion of ["no-preference", "reduce"]) {
        test(`success and error notices share placement and readable dismissal at ${width}px with ${reducedMotion} motion`, async (t) => {
            const { page, frontend, state } = await fileAccessFixture(browser, t, { width });
            await page.emulateMedia({ reducedMotion });
            await page.clock.install();
            await page.goto(`${frontend}/browse/CS101/${fileIds.folder}`);
            const card = page.locator(".file-display").first();
            await card.getByRole("button", { name: "Add to favourites" }).click();
            const success = page.locator('[data-tone="success"]');
            await success.waitFor();
            const successColor = await success.evaluate((n) => getComputedStyle(n).borderLeftColor);
            await success.hover();
            await page.clock.runFor(21000);
            assert.ok(await success.isVisible());
            await page.mouse.move(0, 0);
            await page.clock.runFor(7000);
            assert.ok(await success.isVisible());
            await page.clock.runFor(1500);
            await success.waitFor({ state: "hidden" });
            state.saveStatus = 500;
            await card.getByRole("button", { name: "Remove from favourites" }).click();
            const error = page.locator('[data-tone="error"]');
            await error.waitFor();
            assert.notEqual(
                await error.evaluate((n) => getComputedStyle(n).borderLeftColor),
                successColor,
            );
            const host = page.locator('[aria-label="Notifications"]');
            const rect = await host.boundingBox();
            assert.ok(rect.x >= 15 && rect.x + rect.width <= width - 15 && rect.y > 450);
            const dismiss = error.getByRole("button", { name: "Dismiss notification" });
            await dismiss.focus();
            await page.clock.runFor(21000);
            assert.ok(await error.isVisible());
            await dismiss.press("Enter");
            await page.clock.runFor(500);
            await error.waitFor({ state: "hidden" });
        });
    }

test("active operation notices persist and completed results expire while keeping a resume link", async (t) => {
    const { page, frontend } = await fileAccessFixture(browser, t);
    await page.clock.install();
    await page.route("**/api/operations/notice-fixture", (route) =>
        route.fulfill({
            json: {
                id: "notice-fixture",
                name: "Synthetic upload",
                kind: "upload",
                status: "awaiting",
                folderId: fileIds.folder,
                courseCode: "CS101",
                entries: [],
            },
        }),
    );
    await page.goto(frontend + "/dashboard");
    await page.getByRole("textbox", { name: "Search courses" }).waitFor();
    await page.evaluate(
        (folderId) =>
            window.dispatchEvent(
                new CustomEvent("coursehub-operation", {
                    detail: {
                        id: "notice-fixture",
                        name: "Synthetic upload",
                        kind: "upload",
                        status: "awaiting",
                        folderId,
                        courseCode: "CS101",
                        entries: [],
                    },
                }),
            ),
        fileIds.folder,
    );
    const notice = page.getByRole("complementary", { name: "Content operations" });
    await notice.waitFor();
    await page.clock.runFor(25000);
    assert.ok(await notice.isVisible());
    assert.equal(await notice.getByRole("link", { name: "View upload" }).count(), 1);
    await page.evaluate(() =>
        window.dispatchEvent(
            new CustomEvent("coursehub-operation", {
                detail: {
                    id: "notice-fixture",
                    name: "Synthetic upload",
                    kind: "upload",
                    status: "completed",
                    entries: [],
                },
            }),
        ),
    );
    await notice.locator('[data-tone="success"]').waitFor();
    await page.clock.runFor(9000);
    await notice.waitFor({ state: "hidden" });
});

test("an authenticated delayed preview navigates the new tab with no opener", async (t) => {
    const { page, context, frontend, api } = await fileAccessFixture(browser, t);
    await context.route("**/api/files/preview/**", async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 1200));
        await route.fulfill({
            contentType: "text/html",
            body: "<!doctype html><title>Authenticated preview fixture</title><p>File preview</p>",
        });
    });
    await page.goto(`${frontend}/browse/CS101/${fileIds.folder}`);
    const opened = page.waitForEvent("popup");
    await page.getByRole("link", { name: "Preview Lecture notes.pdf", exact: true }).click();
    const popup = await opened;
    await popup.waitForURL(api + "/api/files/preview/**");
    await popup.waitForLoadState();
    assert.equal(await popup.title(), "Authenticated preview fixture");
    assert.equal(await popup.evaluate(() => window.opener), null);
    assert.equal(await page.locator('[data-tone="error"]').count(), 0);
});

test("courses without listed exams get a neutral state without a retry action", async (t) => {
    const { page, frontend, state } = await examFixture(browser, t);
    for (const type of Object.keys(state.data.exams))
        Object.assign(state.data.exams[type], {
            status: "unavailable",
            items: [],
            missingCourses: [{ code: "QA999" }],
            nextExam: null,
        });
    await page.goto(frontend + "/dashboard");
    await page
        .getByText("No Mid-Sem exam dates are listed for your courses.", { exact: true })
        .waitFor();
    assert.equal(
        await page
            .getByRole("region", { name: "Exam schedule" })
            .getByRole("button", { name: "Try again" })
            .count(),
        0,
    );
});

test("nested sidebar arrows keep their shape and keyboard focus stays inside the selected row", async (t) => {
    const { course, year, folder } = await import("../fixtures/library.js");
    const f = await fileAccessFixture(browser, t, { role: "br" });
    const parent = {
        ...folder,
        _id: "507f1f77bcf86cd799439078",
        name: "Nested notes",
        childType: "Folder",
        children: [{ ...folder, children: [f.file()] }],
    };
    await f.context.route("**/api/course/CS101", (route) =>
        route.fulfill({
            json: { ...course, revision: "nested", children: [{ ...year, children: [parent] }] },
        }),
    );
    await f.page.goto(`${f.frontend}/browse/CS101/${parent._id}`);
    const arrow = f.page.getByRole("button", { name: "Collapse Nested notes" });
    await arrow.waitFor();
    const bounds = await arrow.locator("svg").boundingBox();
    assert.ok(bounds.width >= 16 && Math.abs(bounds.width - bounds.height) < 1);
    const selected = f.page.locator('.main-folder button[aria-current="page"]');
    await selected.focus();
    assert.ok(
        await selected.evaluate((node) => parseFloat(getComputedStyle(node).outlineOffset) <= 0),
    );
    await arrow.press("Enter");
    await arrow.waitFor({ state: "hidden" });
});
