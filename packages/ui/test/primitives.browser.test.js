import assert from "node:assert/strict";
import { before, after, test } from "node:test";
import { chromium } from "playwright";
import fs from "node:fs";
let browser;
before(async () => {
    browser = await chromium.launch({
        executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
    });
});
after(async () => browser?.close());
async function fixture(t, width = 390) {
    const context = await browser.newContext({
        viewport: { width, height: 900 },
        reducedMotion: "reduce",
    });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(process.env.BROWSER_UI_ORIGIN || "http://127.0.0.1:48233", {
        waitUntil: "networkidle",
    });
    t.after(async () => {
        assert.deepEqual(errors, []);
        await context.close();
    });
    return page;
}
for (const width of [390, 1440]) {
    test(`dialog traps focus, closes on Escape and restores the opener at ${width}px`, async (t) => {
        const page = await fixture(t, width);
        const opener = page.getByRole("button", { name: "Open dialog", exact: true });
        await opener.click();
        const dialog = page.getByRole("dialog");
        await dialog.waitFor();
        assert.equal(await page.getByLabel("Description", { exact: true }).count(), 1);
        await dialog.getByRole("button", { name: "Review impact" }).focus();
        await page.keyboard.press("Tab");
        assert.equal(await dialog.evaluate((el) => el.contains(document.activeElement)), true);
        await page.keyboard.press("Shift+Tab");
        assert.equal(await dialog.evaluate((el) => el.contains(document.activeElement)), true);
        assert.equal(await page.evaluate(() => getComputedStyle(document.body).overflow), "hidden");
        await page.keyboard.press("Escape");
        await dialog.waitFor({ state: "hidden" });
        // Focus returns on the frame after the dialog unmounts, so settle first
        // (same pattern as the nested-confirmation case below).
        await page.waitForFunction(
            () => document.activeElement?.textContent?.trim() === "Open dialog",
        );
        assert.equal(await opener.evaluate((el) => el === document.activeElement), true);
    });
    test(`nested confirmation keeps failures open and returns focus to its parent at ${width}px`, async (t) => {
        const page = await fixture(t, width);
        await page.getByRole("button", { name: "Open dialog", exact: true }).click();
        const trigger = page.getByRole("button", { name: "Review impact" });
        await trigger.click();
        const alert = page.getByRole("alertdialog");
        await alert.waitFor();
        assert.equal(
            await alert
                .getByRole("button", { name: "Cancel" })
                .evaluate((el) => el === document.activeElement),
            true,
        );
        await alert.getByRole("button", { name: "Delete file", exact: true }).click();
        await alert.getByRole("alert").waitFor();
        await page.keyboard.press("Escape");
        await alert.waitFor({ state: "hidden" });
        await page.waitForFunction(() => document.activeElement?.textContent === "Review impact");
        assert.equal(await trigger.evaluate((el) => el === document.activeElement), true);
        await page.keyboard.press("Escape");
        await page.getByRole("dialog").waitFor({ state: "hidden" });
    });
}
test("busy prevents dismissal and repeat submission; fields retain accessible errors", async (t) => {
    const page = await fixture(t);
    assert.equal(await page.getByLabel("Course code").getAttribute("aria-invalid"), "true");
    assert.match(await page.getByLabel("Course code").getAttribute("aria-describedby"), /-error/);
    assert.equal(await page.getByRole("button", { name: "Saving…" }).isDisabled(), true);
    await page.getByRole("button", { name: "Open dialog", exact: true }).click();
    await page.getByRole("button", { name: "Toggle busy state" }).click();
    await page.keyboard.press("Escape");
    assert.equal(await page.getByRole("dialog").count(), 1);
    assert.equal(await page.getByRole("button", { name: "Close dialog" }).isDisabled(), true);
    await page.getByRole("button", { name: "Toggle busy state" }).click();
    await page.keyboard.press("Escape");
    await page.getByRole("dialog").waitFor({ state: "hidden" });
});
test("gallery captures long content, keyboard focus, and constrained mobile layouts", async (t) => {
    const page = await fixture(t);
    const dir = process.env.BROWSER_ARTIFACT_DIR;
    for (const width of [320, 390, 768, 1024, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        await page.evaluate(() => document.fonts.ready);
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
        if (dir) {
            fs.mkdirSync(dir, { recursive: true });
            await page.screenshot({ path: `${dir}/gallery-${width}.png`, fullPage: true });
        }
        await page.getByRole("button", { name: "Open dialog", exact: true }).click();
        const action = page.getByRole("button", { name: "Review impact" });
        await action.focus();
        const box = await action.boundingBox();
        assert.ok(box.y + box.height <= 900);
        if (dir) await page.screenshot({ path: `${dir}/dialog-${width}.png` });
        await page.keyboard.press("Escape");
    }
});
