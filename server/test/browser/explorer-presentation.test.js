import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { chromium } from "playwright";
import { fileAccessFixture, fileIds } from "./support/file-access.js";
import { navigationFixture } from "./support/explorer-presentation.js";
import { year } from "../fixtures/library.js";

let browser;
before(async () => {
    browser = await chromium.launch({
        executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
    });
});
after(async () => browser?.close());

for (const touch of [false, true]) {
    test(`folder artwork opens the folder while management controls stay independent (touch=${touch})`, async (t) => {
        const { page, frontend, requests } = await fileAccessFixture(browser, t, {
            role: "br",
            width: touch ? 390 : 1440,
            touch,
        });
        const route = `${frontend}/browse/CS101/${year._id}`;
        const card = page.locator(".browse-folder").first();
        for (const region of ["padding", "body", "footer"]) {
            await page.goto(route);
            await card.waitFor();
            const box = await card.boundingBox();
            await card.click({
                position: {
                    x: region === "footer" ? box.width - 12 : box.width / 2,
                    y:
                        region === "padding"
                            ? 8
                            : region === "body"
                              ? box.height / 2
                              : box.height - 12,
                },
            });
            await page.waitForURL(`**/browse/CS101/${fileIds.folder}`);
        }
        await page.goto(route);
        const open = card.getByRole("button", { name: "Lecture Notes", exact: true });
        await open.focus();
        await open.press("Enter");
        await page.waitForURL(`**/browse/CS101/${fileIds.folder}`);
        await page.goto(route);
        await card.getByRole("button", { name: "Rename", exact: true }).click();
        await card.getByRole("textbox", { name: "Folder name", exact: true }).fill("Unsaved name");
        await card.click({ position: { x: 100, y: 120 } });
        assert.equal(page.url(), route);
        await card.getByRole("button", { name: "Cancel", exact: true }).click();
        await card.getByRole("button", { name: "Delete", exact: true }).click();
        await page
            .getByRole("alertdialog")
            .getByRole("button", { name: "Cancel", exact: true })
            .click();
        assert.equal(page.url(), route);
        assert.equal(requests.filter((r) => !["GET", "HEAD"].includes(r.method)).length, 0);
    });
}

test("semester dropdowns work with the keyboard and sidebar scrolling leaves the page in place", async (t) => {
    const { page, frontend } = await navigationFixture(browser, t);
    await page.setViewportSize({ width: 1440, height: 650 });
    await page.goto(`${frontend}/browse/CS101/${year._id}`);
    const sidebar = page.getByRole("complementary", { name: "Course navigation" });
    const details = sidebar.locator("details").first();
    const summary = details.locator("summary");
    await summary.waitFor();
    assert.equal(await details.getAttribute("open"), null);
    await summary.focus();
    await summary.press("Enter");
    await details.locator(".collapsible").first().waitFor({ state: "visible" });
    assert.notEqual(await details.getAttribute("open"), null);
    await summary.press("Space");
    await details.locator(".collapsible").first().waitFor({ state: "hidden" });
    assert.equal(await details.getAttribute("open"), null);
    await summary.press("Enter");
    await details.locator(".collapsible").first().waitFor({ state: "visible" });
    await page.evaluate(() => window.scrollTo(0, 0));
    await sidebar.evaluate((node) => {
        node.scrollTop = 0;
    });
    const before = await page.getByRole("main", { name: "Course resources" }).boundingBox();
    await sidebar.hover();
    await page.mouse.wheel(0, 500);
    await page.waitForFunction(
        () => document.querySelector('[aria-label="Course navigation"]').scrollTop > 0,
    );
    const after = await page.getByRole("main", { name: "Course resources" }).boundingBox();
    assert.equal(after.y, before.y);
    assert.equal(await sidebar.evaluate((node) => getComputedStyle(node).scrollbarWidth), "none");
    await page.mouse.wheel(0, 10000);
    await page.waitForFunction(() => {
        const node = document.querySelector('[aria-label="Course navigation"]');
        return node.scrollTop + node.clientHeight >= node.scrollHeight - 1;
    });
    await page.mouse.wheel(0, 1000);
    await page.waitForTimeout(150);
    assert.equal(await page.evaluate(() => scrollY), 0);
    await page.goto(`${frontend}/browse/HS201/${year._id}`);
    await details.locator(".collapsible.true").waitFor();
    assert.notEqual(
        await details.getAttribute("open"),
        null,
        "A bookmarked previous course opens its semester",
    );
    await sidebar.locator(".collapsible.true .main").focus();
    await page.keyboard.press("Tab");
    assert.equal(
        await page.evaluate(() => document.activeElement?.textContent.trim()),
        "Lecture Notes(1)",
    );
    await page.keyboard.press("Enter");
    await page.waitForURL(`**/browse/HS201/${fileIds.folder}`);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
});

for (const touch of [false, true]) {
    test(`tree rows are compact for mouse and retain touch targets (touch=${touch})`, async (t) => {
        const { page, frontend } = await navigationFixture(browser, t, { width: 1024, touch });
        await page.goto(`${frontend}/browse/CS101/${year._id}`);
        const rows = page
            .getByRole("complementary", { name: "Course navigation" })
            .locator(".text-content");
        await rows.first().waitFor();
        const boxes = await rows.evaluateAll((nodes) =>
            nodes.map((n) => ({
                row: n.getBoundingClientRect().height,
                button: n.querySelector("button").getBoundingClientRect().height,
            })),
        );
        assert.ok(
            boxes.every((b) => b.row === (touch ? 44 : 28) && b.button === (touch ? 44 : 28)),
        );
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    });
}

test("long folder trees remain reachable through sidebar scrolling", async (t) => {
    const { page, frontend } = await navigationFixture(browser, t, { folderCount: 60 });
    await page.goto(`${frontend}/browse/CS101/${year._id}`);
    const sidebar = page.getByRole("complementary", { name: "Course navigation" });
    await sidebar.getByRole("button", { name: "Topic 60(1)", exact: true }).click();
    await page.waitForURL("**/browse/CS101/507f1f77bcf86cd799431059");
    assert.equal(await page.evaluate(() => scrollY), 0);
});

for (const width of [390, 1440]) {
    test(`Add Folder fields have separation and preserve dialog focus at ${width}px`, async (t) => {
        const { page, frontend } = await navigationFixture(browser, t, {
            width,
            touch: width < 768,
        });
        await page.goto(`${frontend}/browse/CS101/${year._id}`);
        const trigger = page.getByRole("button", { name: "Add Folder", exact: true });
        await trigger.click();
        const dialog = page.getByRole("dialog");
        await dialog.waitFor();
        await dialog.evaluate(async (node) => {
            await Promise.all(node.getAnimations().map((animation) => animation.finished));
        });
        const gap = await dialog
            .locator("form")
            .evaluate(
                (node) =>
                    node.children[1].getBoundingClientRect().y -
                    node.children[0].getBoundingClientRect().bottom,
            );
        assert.equal(gap, 16);
        await dialog.getByRole("textbox", { name: "Folder name" }).fill("Test folder");
        await page.keyboard.press("Tab");
        assert.equal(await page.evaluate(() => document.activeElement?.tagName), "SELECT");
        await page.keyboard.press("Escape");
        await dialog.waitFor({ state: "hidden" });
        await page.waitForFunction(
            () => document.activeElement?.textContent.trim() === "Add Folder",
        );
        assert.equal(await trigger.evaluate((node) => node === document.activeElement), true);
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    });
}

for (const width of [320, 390, 1440]) {
    test(`file, folder and profile rename stay inline and cancel safely at ${width}px`, async (t) => {
        const { page, frontend, requests } = await fileAccessFixture(browser, t, {
            width,
            role: "br",
            touch: width < 768,
        });
        for (const kind of ["file", "folder", "profile"]) {
            const route =
                kind === "profile"
                    ? "/profile"
                    : `/browse/CS101${kind === "file" ? "/" + fileIds.folder : ""}`;
            await page.goto(frontend + route);
            const trigger = page
                .getByRole("button", {
                    name:
                        kind === "file"
                            ? "Rename file"
                            : kind === "folder"
                              ? "Rename"
                              : "Edit name",
                    exact: true,
                })
                .first();
            await trigger.focus();
            await trigger.press("Enter");
            const input = page.getByRole("textbox", {
                name: kind === "file" ? "File name" : kind === "folder" ? "Folder name" : "Name",
                exact: true,
            });
            const form = input.locator("xpath=ancestor::form");
            const bounds = await input.boundingBox();
            const fontSize = await input.evaluate((node) =>
                parseFloat(getComputedStyle(node).fontSize),
            );
            assert.ok(bounds.height <= fontSize * 1.3, "Rename underline follows the text line");
            for (const label of ["Save name", "Cancel"]) {
                const button = form.getByRole("button", { name: label, exact: true });
                const rect = await button.boundingBox();
                assert.ok(Math.abs(rect.y + rect.height / 2 - bounds.y - bounds.height / 2) < 2);
                assert.ok(
                    rect.width >= (width === 1440 ? 27.9 : 43.9) &&
                        rect.height >= (width === 1440 ? 27.9 : 43.9),
                    `${kind} ${label}: ${JSON.stringify(rect)}`,
                );
                assert.ok(rect.x >= bounds.x + bounds.width - 1);
            }
            assert.equal(
                await input.evaluate((node) => getComputedStyle(node).backgroundColor),
                "rgba(0, 0, 0, 0)",
            );
            if (kind === "profile") {
                assert.ok(
                    await input.evaluate(
                        (node) => parseFloat(getComputedStyle(node).fontSize) >= 28,
                    ),
                );
            }
            const priorMutations = requests.filter(
                (request) => !["GET", "HEAD"].includes(request.method),
            ).length;
            await input.fill("");
            await input.press("Enter");
            await form.getByRole("alert").waitFor();
            assert.equal(
                requests.filter((request) => !["GET", "HEAD"].includes(request.method)).length,
                priorMutations,
            );
            await input.fill("Unsaved name");
            await input.press("Tab");
            assert.equal(
                requests.filter((request) => !["GET", "HEAD"].includes(request.method)).length,
                priorMutations,
            );
            await page.keyboard.press("Escape");
            await form.waitFor({ state: "hidden" });
            await page.waitForFunction(() => document.activeElement?.tagName === "BUTTON");
            assert.equal(await trigger.evaluate((node) => document.activeElement === node), true);
            assert.ok(
                await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
            );
        }
    });
}

for (const touch of [false, true]) {
    test(`file names stay centered and hovered actions render one icon (touch=${touch})`, async (t) => {
        const { page, frontend } = await fileAccessFixture(browser, t, {
            role: "br",
            width: touch ? 390 : 1440,
            touch,
        });
        await page.goto(`${frontend}/browse/CS101/${fileIds.folder}`);
        const card = page.locator(".file-display").first();
        await card.waitFor();
        for (const action of ["Add to favourites", "Share file", "Download file", "Rename file"]) {
            const button = card.getByRole("button", { name: action, exact: true });
            await button.hover();
            await page.waitForFunction((label) => {
                const node = document.querySelector(`[aria-label="${label}"]`);
                return node && getComputedStyle(node).backgroundImage === "none";
            }, action);
            assert.equal(await button.locator("img, svg").count(), 1);
            const rect = await button.boundingBox();
            assert.equal(Math.round(rect.width), touch ? 44 : 28);
            assert.equal(Math.round(rect.height), touch ? 44 : 28);
            assert.ok(
                await card.evaluate((node) => {
                    const a = node.getBoundingClientRect(),
                        b = node.querySelector(".title-text").getBoundingClientRect();
                    return Math.abs(a.x + a.width / 2 - b.x - b.width / 2) < 1;
                }),
            );
        }
        if (!touch) {
            const remove = page.getByRole("button", { name: "Delete year 2026" });
            await remove.hover();
            const rect = await remove.boundingBox();
            assert.equal(Math.round(rect.width), 28);
            assert.equal(Math.round(rect.height), 28);
            await remove.focus();
            assert.equal(await remove.evaluate((node) => node === document.activeElement), true);
        }
    });
}

for (const touch of [false, true]) {
    test(`explorer actions reveal on hover/focus and remain available with touch=${touch}`, async (t) => {
        const { page, frontend } = await fileAccessFixture(browser, t, {
            role: "br",
            width: touch ? 390 : 1440,
            touch,
        });
        for (const kind of ["file", "folder"]) {
            await page.goto(
                frontend + "/browse/CS101" + (kind === "file" ? "/" + fileIds.folder : ""),
            );
            const card = page.locator(kind === "file" ? ".file-display" : ".browse-folder").first();
            const edit = card.locator(".rename-tick");
            await card.waitFor();
            await page.mouse.move(0, 0);
            assert.equal(
                await edit.evaluate((node) => getComputedStyle(node).opacity),
                touch ? "1" : "0",
            );
            if (!touch) {
                await card.hover();
                await page.waitForFunction(
                    (selector) =>
                        getComputedStyle(document.querySelector(selector)).opacity === "1",
                    kind === "file" ? ".file-display .rename-tick" : ".browse-folder .rename-tick",
                );
                await page.mouse.move(0, 0);
                await edit.focus();
                await edit.press("Enter");
                await card.locator("input").waitFor();
                await page.keyboard.press("Escape");
                assert.equal(await edit.evaluate((node) => document.activeElement === node), true);
            }
            await page.emulateMedia({ reducedMotion: "reduce" });
            assert.equal(
                await card.evaluate((node) => getComputedStyle(node).animationName),
                "none",
            );
            assert.ok(
                await edit.evaluate((node) =>
                    getComputedStyle(node)
                        .transitionDuration.split(",")
                        .every((duration) => parseFloat(duration) <= 0.00001),
                ),
            );
            await page.emulateMedia({ reducedMotion: "no-preference" });
        }
    });
}
