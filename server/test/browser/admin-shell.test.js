import assert from "node:assert/strict";
import { before, after, test } from "node:test";
import { chromium } from "playwright";
import { adminExperienceFixture } from "./support/admin-experience.js";
let browser;
before(async () => {
    browser = await chromium.launch({
        executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
    });
});
after(async () => browser?.close());
for (const width of [320, 390, 768, 1024, 1440])
    test(`admin routes keep their content within the page at ${width}px`, async () => {
        for (const scenario of [
            "students",
            "courses",
            "course-dashboard",
            "course-linking",
            "courses-without-br",
            "operations",
        ]) {
            const f = await adminExperienceFixture(browser, { width, scenario });
            try {
                await f.page.goto(
                    f.origin +
                        "/admin/" +
                        (scenario === "course-dashboard" ? "courses/CS101" : scenario),
                    { waitUntil: "networkidle" },
                );
                assert.ok(await f.page.getByRole("heading", { level: 1 }).first().isVisible());
                assert.ok(
                    await f.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
                    scenario,
                );
                assert.deepEqual(f.errors, []);
                if (width <= 1024)
                    assert.ok(
                        await f.page.getByRole("button", { name: "Open navigation" }).isVisible(),
                    );
                else
                    assert.ok(
                        await f.page
                            .getByRole("navigation", { name: "Administrator navigation" })
                            .isVisible(),
                    );
            } finally {
                await f.context.close();
            }
        }
    });
for (const width of [390, 1024])
    test(`admin drawer traps focus, restores it and follows selected routes at ${width}px`, async () => {
        const f = await adminExperienceFixture(browser, { width });
        try {
            await f.page.goto(f.origin + "/admin/students");
            const trigger = f.page.getByRole("button", { name: "Open navigation" });
            await trigger.click();
            const dialog = f.page.getByRole("dialog", { name: "Navigation" });
            await dialog.waitFor();
            assert.equal(
                await f.page.locator("body").evaluate((node) => getComputedStyle(node).overflow),
                "hidden",
            );
            for (let i = 0; i < 10; i++) {
                await f.page.keyboard.press("Tab");
                assert.ok(await dialog.evaluate((node) => node.contains(document.activeElement)));
            }
            await f.page.keyboard.press("Escape");
            await dialog.waitFor({ state: "hidden" });
            await f.page.waitForFunction(
                () => document.activeElement?.getAttribute("aria-label") === "Open navigation",
            );
            await trigger.click();
            await dialog.getByRole("link", { name: "Courses", exact: true }).click();
            await f.page.waitForURL("**/admin/courses");
            await dialog.waitFor({ state: "hidden" });
            assert.deepEqual(f.errors, []);
        } finally {
            await f.context.close();
        }
    });
for (const width of [390, 1440])
    test(`admin login is outside the sidebar and retains failed credentials at ${width}px`, async () => {
        const f = await adminExperienceFixture(browser, { width, scenario: "login" });
        try {
            await f.page.route("**/api/admin/auth/login", (route) =>
                route.fulfill({ status: 401, json: { message: "Incorrect credentials" } }),
            );
            await f.page.goto(
                f.origin + "/admin/login?returnTo=%2Fadmin%2Fcourses%3Fpage%3D2%23list",
            );
            assert.equal(await f.page.getByRole("complementary").count(), 0);
            await f.page.getByRole("textbox", { name: /User ID/ }).fill("synthetic-admin");
            await f.page.getByLabel(/^Password/).fill("synthetic-password");
            await f.page.getByRole("button", { name: "Sign In", exact: true }).click();
            await f.page.getByRole("alert").filter({ hasText: "Incorrect credentials" }).waitFor();
            assert.equal(
                await f.page.getByRole("textbox", { name: /User ID/ }).inputValue(),
                "synthetic-admin",
            );
            assert.equal(await f.page.getByLabel(/^Password/).inputValue(), "synthetic-password");
            assert.ok(f.page.url().includes("returnTo="));
            assert.deepEqual(f.errors, []);
        } finally {
            await f.context.close();
        }
    });
