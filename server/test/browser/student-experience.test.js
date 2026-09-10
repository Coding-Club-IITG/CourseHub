import assert from "node:assert/strict";
import { before, after, test } from "node:test";
import { chromium } from "playwright";
import { experienceFixture } from "./support/student-experience.js";
let browser;
before(async () => {
    browser = await chromium.launch({
        executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
    });
});
after(async () => browser?.close());
for (const width of [390, 1440]) {
    test(`student history, equal cards and navigation work with keyboard at ${width}px`, async (t) => {
        const { page, frontend } = await experienceFixture(browser, t, {
            width,
            scenario: "history",
        });
        await page.goto(frontend + "/dashboard");
        const history = page.getByRole("button", { name: "SHOW PREVIOUS COURSES" });
        await history.focus();
        await page.keyboard.press("Enter");
        const semester = page.getByRole("button", { name: "Semester 1 (2020)" });
        await semester.focus();
        await page.keyboard.press("Space");
        assert.equal(await semester.getAttribute("aria-expanded"), "true");
        const cards = page.locator("#semester-0 .coursecard");
        assert.equal(await cards.count(), 15);
        const heights = await cards.evaluateAll((nodes) =>
            nodes.map((node) => node.getBoundingClientRect().height),
        );
        assert.equal(new Set(heights).size, 1);
        if (width === 390) {
            const trigger = page.getByRole("button", { name: "Toggle mobile menu" });
            await trigger.click();
            await page.keyboard.press("Escape");
            assert.ok(await trigger.evaluate((node) => node === document.activeElement));
            await trigger.click();
            await page.getByRole("link", { name: "Profile", exact: true }).click();
            await page.waitForURL("**/profile");
            assert.equal(await trigger.getAttribute("aria-expanded"), "false");
        }
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    });
    test(`profile shows another user's own contributions and a refresh button below errors at ${width}px`, async (t) => {
        const { page, frontend } = await experienceFixture(browser, t, {
            width,
            scenario: "other-user",
        });
        await page.goto(frontend + "/profile");
        await page.locator(".main_card").nth(3).waitFor();
        assert.equal(await page.locator(".main_card").count(), 4);
        assert.ok(await page.getByRole("heading", { name: "Second Test Student" }).isVisible());
        assert.equal(await page.getByRole("button", { name: "Approve", exact: true }).count(), 0);
        await page.route("**/api/contribution/", (r) =>
            r.fulfill({ status: 503, json: { message: "Synthetic load failure" } }),
        );
        await page.reload();
        const error = page.getByRole("alert").filter({ hasText: "Could not load contributions" });
        await error.waitFor();
        const refresh = page.getByRole("button", { name: "Refresh registered courses" });
        const errorBox = await error.boundingBox(),
            buttonBox = await refresh.boundingBox();
        assert.ok(buttonBox.y >= errorBox.y + errorBox.height);
        assert.ok(buttonBox.height >= 44);
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    });
}
test("search uses current results for unregistered courses and discards a stale response", async (t) => {
    const { page, frontend } = await experienceFixture(browser, t);
    let release, started;
    const firstStarted = new Promise((resolve) => (started = resolve)),
        late = new Promise((resolve) => (release = resolve));
    await page.route("**/api/search", async (route) => {
        const { words } = route.request().postDataJSON();
        if (words[0] === "old") {
            started();
            await late;
            await route
                .fulfill({ json: { results: [{ code: "OLD101", name: "Old result" }] } })
                .catch(() => {});
        } else
            await route.fulfill({
                json: { results: [{ code: "QA999", name: "New unregistered result" }] },
            });
    });
    await page.goto(frontend + "/dashboard");
    const input = page.getByRole("textbox", { name: "Search courses" });
    await input.fill("old");
    await input.press("Enter");
    await firstStarted;
    await input.fill("new");
    await input.press("Enter");
    await page.getByRole("link", { name: /QA999/ }).waitFor();
    release();
    await page.getByRole("link", { name: /QA999/ }).click();
    await page.waitForURL("**/browse/QA999");
    assert.equal(await page.getByRole("link", { name: /OLD101/ }).count(), 0);
});
for(const width of [390,1440]) test(`BR file actions stay together and year deletion remains discoverable at ${width}px`,async t=>{
 const {fileAccessFixture,fileIds}=await import('./support/file-access.js');const {page,frontend}=await fileAccessFixture(browser,t,{width,role:'br'});await page.goto(`${frontend}/browse/CS101/${fileIds.folder}`);const cards=page.locator('.file-display');await cards.nth(1).waitFor();await page.mouse.move(0,0);
 const heights=await cards.evaluateAll(nodes=>nodes.map(node=>node.getBoundingClientRect().height));assert.equal(heights[0],heights[1]);assert.equal(await cards.first().locator('.file-actions').getByRole('button',{name:'Delete file'}).count(),1);
 await cards.first().getByRole('button',{name:'Rename file'}).click();assert.equal(await page.getByRole('dialog').count(),0);await cards.first().getByRole('textbox',{name:'File name'}).waitFor();await page.keyboard.press('Escape');await cards.first().locator('form').waitFor({state:'hidden'});
 if(width===1440){await page.mouse.move(0,0);const remove=page.getByRole('button',{name:'Delete year 2026'});assert.equal(await remove.evaluate(node=>getComputedStyle(node).opacity),'0');await remove.focus();assert.equal(await remove.evaluate(node=>getComputedStyle(node).opacity),'1');await page.keyboard.press('Enter');await page.getByRole('alertdialog').waitFor();await page.keyboard.press('Escape');}
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
});
