import assert from "node:assert/strict";
import { before, after, test } from "node:test";
import { chromium } from "playwright";
import { courseAdministrationFixture } from "./support/course-administration.js";
let browser;
before(
    async () =>
        (browser = await chromium.launch({
            executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
        })),
);
after(async () => browser?.close());
for (const width of [320, 390, 1440])
    test(`course actions retain failed edits and deletion adjusts the last page at ${width}px`, async () => {
        const f = await courseAdministrationFixture(browser, { width });
        let release;
        try {
            await f.page.goto(f.origin + "/admin/courses?page=2");
            await f.page.getByText("QA021", { exact: true }).waitFor();
            await f.page.getByTitle("Edit course code and name").click();
            let dialog = f.page.getByRole("dialog");
            await dialog.getByRole("textbox", { name: "Course code", exact: true }).fill("QA022");
            await dialog
                .getByRole("textbox", { name: "Course name", exact: true })
                .fill("Renamed course");
            f.state.failure = true;
            await dialog.getByRole("button", { name: "Save changes", exact: true }).click();
            await dialog.getByRole("alert").waitFor();
            assert.equal(
                await dialog
                    .getByRole("textbox", { name: "Course name", exact: true })
                    .inputValue(),
                "Renamed course",
            );
            f.state.failure = false;
            f.state.hold = new Promise((resolve) => (release = resolve));
            await dialog.getByRole("button", { name: "Save changes", exact: true }).click();
            await dialog.getByText("Saving course and its references…").waitFor();
            await f.page.keyboard.press("Escape");
            assert.equal(await dialog.count(), 1);
            release();
            f.state.hold = null;
            await dialog.waitFor({ state: "hidden" });
            await f.page.getByText("QA022", { exact: true }).waitFor();
            await f.page.getByTitle("Delete course", { exact: true }).click();
            dialog = f.page.getByRole("alertdialog");
            assert.match(await dialog.textContent(), /Shared folders/);
            f.state.failure = true;
            await dialog.getByRole("button", { name: "Delete Course", exact: true }).click();
            await dialog.getByRole("alert").waitFor();
            assert.equal(f.state.items.length, 21);
            f.state.failure = false;
            await dialog.getByRole("button", { name: "Delete Course", exact: true }).click();
            await dialog.waitFor({ state: "hidden" });
            await f.page.getByText("20 results · Page 1 of 1").waitFor();
            assert.ok(
                await f.page
                    .getByRole("status")
                    .filter({ hasText: "Course QA022 deleted" })
                    .isVisible(),
            );
            assert.ok(
                await f.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
            );
            assert.deepEqual(f.errors, []);
        } finally {
            release?.();
            await f.context.close();
        }
    });
test("course search and filters use server pages and retain bookmarked query/hash", async () => {
    const f = await courseAdministrationFixture(browser);
    try {
        await f.page.goto(f.origin + "/admin/courses?q=%5Bliteral%5D&pageSize=10#content");
        await f.page.getByText("21 results · Page 1 of 3").waitFor();
        assert.equal(f.state.lists.length, 1);
        await f.page.getByRole("button", { name: "Without names", exact: true }).click();
        await f.page.getByText("No courses found", { exact: true }).waitFor();
        assert.equal(new URL(f.page.url()).hash, "#content");
        assert.equal(f.state.lists.at(-1).nameless, "true");
        await f.page.getByRole("button", { name: "Reset filters", exact: true }).click();
        await f.page.getByText("21 results · Page 1 of 2").waitFor();
        assert.equal(new URL(f.page.url()).hash, "#content");
        assert.deepEqual(f.errors, []);
    } finally {
        await f.context.close();
    }
});
