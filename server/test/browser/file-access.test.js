import assert from "node:assert/strict";
import { test, before, after } from "node:test";
import { chromium } from "playwright";
import { fileAccessFixture, fileIds } from "./support/file-access.js";
let browser;
before(async () => {
    browser = await chromium.launch({
        headless: true,
        executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
    });
});
after(async () => browser?.close());
for (const width of [1440, 390]) {
    test(`favourite actions wait for persistence and saved links select the file at ${width}px`, async (t) => {
        const { page, state, frontend, requests } = await fileAccessFixture(browser, t, { width });
        await page.goto(`${frontend}/browse/CS101/${fileIds.folder}`);
        const card = page.locator(".file-display").first();
        state.saveStatus = 500;
        await card.getByRole("button", { name: "Add to favourites" }).click();
        await page
            .getByText("Favourites could not be saved. Please retry.", { exact: true })
            .waitFor();
        assert.equal(
            await card
                .getByRole("button", { name: "Add to favourites" })
                .getAttribute("aria-pressed"),
            "false",
        );
        await page.getByRole("button", { name: "Dismiss notification", exact: true }).click();
        state.saveStatus = 200;
        await card.getByRole("button", { name: "Add to favourites" }).click();
        await card.getByRole("button", { name: "Remove from favourites" }).waitFor();
        const saved = requests.find((r) => r.path === "/api/user/favourites");
        assert.deepEqual(JSON.parse(saved.body), { id: fileIds.file, code: "CS101" });
        await page.goto(frontend + "/dashboard");
        await page.locator(".favourite-location").click();
        await page.locator(".file-display.selected").waitFor();
        assert.equal(new URL(page.url()).searchParams.get("file"), fileIds.file);
        assert.equal(
            await page
                .locator(".file-display.selected")
                .evaluate((el) => document.activeElement === el),
            true,
        );
        await page
            .locator(".file-display.selected")
            .getByRole("button", { name: "Remove from favourites" })
            .click();
        await page.goto(frontend + "/dashboard");
        await page.getByText("No favourites yet.", { exact: false }).waitFor();
    });
    test(`one controlled share dialog copies the frontend file destination and restores focus at ${width}px`, async (t) => {
        const { page, frontend } = await fileAccessFixture(browser, t, { width });
        await page.addInitScript(() =>
            Object.defineProperty(navigator, "clipboard", {
                configurable: true,
                value: {
                    writeText: (value) =>
                        new Promise((resolve, reject) => {
                            window.finishCopy = (success) => {
                                if (success) {
                                    window.copiedLink = value;
                                    resolve();
                                } else reject(Error("Denied"));
                            };
                        }),
                },
            }),
        );
        await page.goto(`${frontend}/browse/CS101/${fileIds.folder}`);
        const trigger = page.getByRole("button", { name: "Share file", exact: true }).first();
        await trigger.click();
        const dialog = page.getByRole("dialog", { name: "Share file", exact: true });
        assert.equal(await page.getByRole("dialog").count(), 1);
        assert.equal(await page.evaluate(() => getComputedStyle(document.body).overflow), "hidden");
        assert.deepEqual(
            await page.locator("[id]").evaluateAll((els) => {
                const ids = els.map((el) => el.id);
                return ids.filter((id, i) => ids.indexOf(id) !== i);
            }),
            [],
        );
        const link = await dialog.getByRole("textbox", { name: "Share link" }).inputValue();
        assert.equal(link, `${frontend}/browse/CS101/${fileIds.folder}?file=${fileIds.file}`);
        await dialog.getByRole("button", { name: "Copy link" }).press("Enter");
        await page.waitForFunction(() => typeof window.finishCopy === "function");
        assert.equal(await dialog.getByText("Link copied.", { exact: true }).count(), 0);
        await page.evaluate(() => window.finishCopy(false));
        await dialog.getByText("Could not copy.", { exact: false }).waitFor();
        await dialog.getByRole("button", { name: "Copy link" }).press("Enter");
        await page.evaluate(() => window.finishCopy(true));
        await dialog.getByText("Link copied.", { exact: true }).waitFor();
        assert.equal(await page.evaluate(() => window.copiedLink), link);
        await page.keyboard.press("Escape");
        assert.equal(await dialog.count(), 0);
        await page.waitForFunction(
            () => document.activeElement?.getAttribute("aria-label") === "Share file",
        );
        assert.equal(await trigger.evaluate((el) => document.activeElement === el), true);
    });
    test(`missing file selection and unavailable favourites are explicit at ${width}px`, async (t) => {
        const { page, state, frontend } = await fileAccessFixture(browser, t, { width });
        state.favourite = true;
        state.unavailable = true;
        await page.goto(frontend + "/dashboard");
        await page.getByText("Unavailable file", { exact: true }).waitFor();
        assert.equal(await page.getByRole("button", { name: "Share file" }).count(), 0);
        await page.getByRole("button", { name: "Remove from favourites" }).click();
        await page.getByText("No favourites yet.", { exact: false }).waitFor();
        await page.goto(`${frontend}/browse/CS101/${fileIds.folder}?file=${fileIds.file}`);
        await page.getByRole("alert").filter({ hasText: "This file was removed" }).waitFor();
        state.unavailable = false;
        await page.getByRole("button", { name: "Try again" }).click();
        await page.locator(".file-display.selected").waitFor();
    });
}
test("share destination survives sign-in and pending files remain unavailable to another student", async (t) => {
    const { page, state, frontend, requests } = await fileAccessFixture(browser, t);
    state.signedIn = false;
    const destination = `/browse/CS101/${fileIds.folder}?file=${fileIds.file}`;
    await page.goto(frontend + destination);
    await page.waitForURL("**/?returnTo=*");
    assert.equal(new URL(page.url()).searchParams.get("returnTo"), destination);
    assert.equal(
        requests.some((r) => r.path.startsWith("/api/course/")),
        false,
    );
    state.signedIn = true;
    state.pending = true;
    await page.reload();
    await page.getByRole("alert").filter({ hasText: "This file was removed" }).waitFor();
    assert.equal(new URL(page.url()).pathname + new URL(page.url()).search, destination);
    assert.equal(
        requests.some((r) => r.path.startsWith("/api/files/")),
        false,
    );
});
test("owners can share pending files with an explicit access explanation", async (t) => {
    const { page, state, frontend } = await fileAccessFixture(browser, t, { role: "owner" });
    state.pending = true;
    await page.goto(`${frontend}/browse/CS101/${fileIds.folder}`);
    await page.getByRole("button", { name: "Share file" }).first().click();
    await page
        .getByRole("dialog")
        .getByText("This file is pending approval.", { exact: false })
        .waitFor();
});
test("thumbnail failure falls back and downloads report access failures without losing the file view", async (t) => {
    const { page, state, frontend, requests } = await fileAccessFixture(browser, t);
    await page.goto(`${frontend}/browse/CS101/${fileIds.folder}`);
    const card = page.locator(".file-display").first();
    await card.locator(".file-thumbnail span").waitFor();
    await card.locator(".file-thumbnail img").waitFor({ state: "detached" });
    state.fileStatus = 404;
    await card.getByRole("button", { name: "Download file" }).click();
    await page.getByText("This file is unavailable.", { exact: true }).waitFor();
    state.fileStatus = 200;
    state.contentStatus = 503;
    await card.getByRole("button", { name: "Download file" }).click();
    await page.getByText("File delivery unavailable. Please retry.", { exact: true }).waitFor();
    state.contentStatus = 200;
    const saved = page.waitForEvent("download");
    await card.getByRole("button", { name: "Download file" }).click();
    assert.equal((await saved).suggestedFilename(), "Lecture notes.pdf");
    assert.ok(
        requests.some(
            (r) =>
                r.path.startsWith("/api/files/content/") &&
                r.headers["x-session-role"] === "student",
        ),
    );
});

test("preview opens the authenticated resource endpoint and reports revoked access there", async (t) => {
    const { page, state, frontend, api, requests } = await fileAccessFixture(browser, t);
    await page.goto(`${frontend}/browse/CS101/${fileIds.folder}`);
    state.fileStatus = 404;
    const denied = page.waitForEvent("popup");
    await page.getByRole("link", { name: "Preview Lecture notes.pdf", exact: true }).click();
    const deniedTab = await denied;
    await deniedTab.getByText("This file is unavailable.", { exact: false }).waitFor();
    assert.equal(await deniedTab.evaluate(() => window.opener), null);
    assert.equal(deniedTab.url(), `${api}/api/files/preview/${fileIds.file}?courseCode=CS101`);
    assert.ok(
        requests.some(
            (r) =>
                r.path.startsWith("/api/files/preview/") &&
                r.headers.cookie?.includes("token=synthetic"),
        ),
    );
    assert.equal(
        requests.some((r) => r.path.startsWith("/api/files/link/")),
        false,
    );
    await deniedTab.close();
    assert.equal(await page.locator(".file-display").count(), 2);
});

test("a share dialog closes when revalidation removes its file", async (t) => {
    const { page, context, state, frontend } = await fileAccessFixture(browser, t);
    await page.goto(`${frontend}/browse/CS101/${fileIds.folder}`);
    await page.getByRole("button", { name: "Share file" }).first().click();
    await page.getByRole("dialog").waitFor();
    await context.setOffline(true);
    state.unavailable = true;
    await context.setOffline(false);
    await page.getByRole("dialog").waitFor({ state: "hidden" });
    assert.equal(await page.locator(".file-display").count(), 0);
    assert.equal(await page.evaluate(() => document.documentElement.style.overflow), "");
});
