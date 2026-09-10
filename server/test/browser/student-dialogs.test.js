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
for (const width of [390, 1440])
    test(`course search retains failed additions and Escape restores focus at ${width}px`, async (t) => {
        const { page, frontend } = await fileAccessFixture(browser, t, { width });
        await page.route("**/api/search", (r) =>
            r.fulfill({
                json: {
                    found: true,
                    results: [
                        {
                            _id: "507f1f77bcf86cd799439099",
                            code: "QA999",
                            name: "A course with a long name, shared examples and lecture material",
                        },
                    ],
                },
            }),
        );
        await page.route("**/api/user/readonly", (r) =>
            r.fulfill({ status: 500, json: { message: "Cannot add this course. Please retry." } }),
        );
        await page.goto(frontend + "/dashboard");
        const trigger = page.locator(".coursecard.ADD");
        await trigger.click();
        const dialog = page.getByRole("dialog", { name: "Add New Course" });
        await dialog.waitFor();
        await page.getByLabel("Course code or name").fill("QA999");
        await page.getByRole("button", { name: "Search courses" }).click();
        await dialog.getByRole("button", { name: /QA999/ }).click();
        await dialog.getByRole("alert").waitFor();
        assert.ok(await dialog.getByRole("button", { name: /QA999/ }).isVisible());
        await page.keyboard.press("Escape");
        await dialog.waitFor({ state: "hidden" });
    });
test("a failed rename retains its input and does not save on blur", async (t) => {
    const { page, frontend, requests } = await fileAccessFixture(browser, t, { role: "br" });
    await page.route("**/api/files/rename/*", (r) =>
        r.fulfill({ status: 503, json: { message: "Rename unavailable. Please retry." } }),
    );
    await page.goto(`${frontend}/browse/CS101/${fileIds.folder}`);
    await page.locator(".file-display .rename-tick").first().click();
    const dialog = page.locator(".file-display form").first(),
        input = dialog.getByLabel("File name");
    await input.fill("Revised lecture");
    await page.keyboard.press("Tab");
    assert.equal(
        requests.some((r) => r.path.includes("rename")),
        false,
    );
    await dialog.getByRole("button", { name: "Save name" }).click();
    await dialog.getByRole("alert").waitFor();
    assert.equal(await input.inputValue(), "Revised lecture");
    await page.keyboard.press("Escape");
    await dialog.waitFor({ state: "hidden" });
});
