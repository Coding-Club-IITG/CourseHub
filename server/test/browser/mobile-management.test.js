import assert from "node:assert/strict";
import { before, after, test } from "node:test";
import { chromium } from "playwright";
import { fileAccessFixture, fileIds } from "./support/file-access.js";
let browser;
before(async () => {
    browser = await chromium.launch({
        executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
    });
});
after(async () => browser?.close());
for (const width of [320, 390, 768, 1024, 1440])
    for (const role of ["student", "br"])
        test(`${role} has authorized course actions with touch and keyboard at ${width}px`, async (t) => {
            const { page, frontend, state } = await fileAccessFixture(browser, t, {
                width,
                role,
                touch: true,
            });
            state.pending = role === "br";
            await page.goto(`${frontend}/browse/CS101/${fileIds.folder}`);
            await page.getByRole("group", { name: "Folder actions" }).waitFor();
            assert.ok(await page.getByTitle("Download entire folder as ZIP").isVisible());
            const contribute = page.getByRole("button", {
                name: role === "br" ? "Add File" : "Contribute",
                exact: true,
            });
            await contribute.tap();
            await page
                .getByRole("dialog", { name: role === "br" ? "Upload Files" : "Share Your Files" })
                .waitFor();
            await page.keyboard.press("Escape");
            const card = page.locator(".file-display").first();
            assert.equal(
                await card.getByRole("button", { name: "Rename file" }).count(),
                role === "br" ? 1 : 0,
            );
            assert.equal(
                await card.getByRole("button", { name: "Delete file" }).count(),
                role === "br" ? 1 : 0,
            );
            if (role === "br") {
                await card.getByRole("button", { name: "Verify file" }).tap();
                await page
                    .getByRole("alertdialog")
                    .getByText(/CS101, MA101/)
                    .waitFor();
                await page.keyboard.press("Escape");
                await card.getByRole("button", { name: "Delete file" }).tap();
                await page
                    .getByRole("alertdialog")
                    .getByText(/every listed course/)
                    .waitFor();
                await page.keyboard.press("Escape");
                await page.getByRole("button", { name: "New Year", exact: true }).tap();
                await page.getByRole("dialog", { name: "Add Year" }).waitFor();
                await page.keyboard.press("Escape");
            }
            await page.getByRole("button", { name: "Back to 2026", exact: true }).click();
            const folder = page.locator(".browse-folder").first();
            await folder.waitFor();
            assert.ok(await folder.getByRole("button", { name: /Lecture Notes/ }).isVisible());
            if (role === "br") {
                await page.getByRole("button", { name: "Add Folder", exact: true }).click();
                await page.getByRole("dialog", { name: "Add Folder" }).waitFor();
                await page.keyboard.press("Escape");
                await folder.getByRole("button", { name: "Rename", exact: true }).click();
                const dialog = folder.locator("form");
                await dialog.waitFor();
                await page.keyboard.press("Escape");
                await folder.getByRole("button", { name: /Delete|Remove/, exact: true }).click();
                await page.getByRole("alertdialog").waitFor();
                await page.keyboard.press("Escape");
            } else
                assert.equal(
                    await page.getByRole("button", { name: "New Year", exact: true }).count(),
                    0,
                );
            assert.ok(
                await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
            );
        });
