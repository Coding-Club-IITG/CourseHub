import assert from "node:assert/strict";
import { before, after, test } from "node:test";
import { chromium } from "playwright";
import { importFixture, importId } from "./support/imports.js";
let browser;
before(
    async () =>
        (browser = await chromium.launch({
            executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
        })),
);
after(async () => browser?.close());
const file = (type) => ({
    name: "synthetic.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(
        type === "courses"
            ? '\ufeffcode,name\nCS101,"Analysis, examples\nand proofs"\nQA.NEW,New course\nqa.new,New course\n'
            : 'email\n"BR@EXAMPLE.TEST"\nbr@example.test\nsecond@example.test\n',
    ),
});
for (const width of [390, 1440])
    for (const type of ["courses", "brs"])
        test(`${type} import survives refresh and partial retry retains successful rows at ${width}px`, async () => {
            const f = await importFixture(browser, { width, type });
            try {
                await f.page.goto(
                    f.origin +
                        (type === "courses"
                            ? "/admin/courses?sort=code#content"
                            : "/admin/students?isBR=true#content"),
                );
                await f.page
                    .getByRole("button", {
                        name: type === "courses" ? "Add Courses" : "Add BRs",
                        exact: true,
                    })
                    .click();
                if (type === "brs")
                    await f.page.getByRole("button", { name: "Bulk Upload", exact: true }).click();
                const dialog = f.page.getByRole("dialog");
                await dialog.getByLabel("CSV file", { exact: true }).setInputFiles(file(type));
                await dialog.getByRole("list", { name: "Import preview" }).waitFor();
                assert.equal(
                    await dialog
                        .getByRole("list", { name: "Import preview" })
                        .locator("li")
                        .count(),
                    3,
                );
                if (type === "courses")
                    await dialog
                        .getByText("Analysis, examples\nand proofs", { exact: true })
                        .waitFor();
                f.state.status = "partial";
                await dialog.getByRole("button", { name: "Confirm import", exact: true }).click();
                await dialog.getByRole("button", { name: "Retry unfinished rows" }).waitFor();
                assert.equal(new URL(f.page.url()).searchParams.get("import"), importId);
                assert.equal(new URL(f.page.url()).hash, "#content");
                await f.page.reload();
                await f.page
                    .getByRole("dialog")
                    .getByText("Some rows need attention", { exact: true })
                    .waitFor();
                const result = f.page
                    .getByRole("dialog")
                    .getByRole("list", { name: "Import results" });
                assert.equal(await result.locator("li").count(), 3);
                await f.page
                    .getByRole("button", { name: "Retry unfinished rows", exact: true })
                    .click();
                await f.page
                    .getByRole("dialog")
                    .getByText("Import completed", { exact: true })
                    .waitFor();
                assert.equal(f.state.submissions.length, 1);
                assert.equal(f.state.retries, 1);
                await f.page
                    .getByRole("dialog")
                    .getByRole("button", { name: "Close", exact: true })
                    .click();
                assert.equal(new URL(f.page.url()).searchParams.has("import"), false);
                assert.ok(
                    await f.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
                );
                assert.deepEqual(f.errors, []);
            } finally {
                await f.context.close();
            }
        });
test("invalid CSV blocks requests and an interrupted submission retains the same validated plan", async () => {
    const f = await importFixture(browser);
    try {
        await f.page.goto(f.origin + "/admin/courses");
        await f.page.getByRole("button", { name: "Add Courses", exact: true }).click();
        const dialog = f.page.getByRole("dialog"),
            input = dialog.getByLabel("CSV file", { exact: true });
        await input.setInputFiles({
            name: "bad.csv",
            mimeType: "text/csv",
            buffer: Buffer.from('code,name\nCS101,"unclosed'),
        });
        await dialog.getByRole("alert").waitFor();
        assert.equal(
            await dialog.getByRole("button", { name: "Confirm import" }).isDisabled(),
            true,
        );
        assert.equal(f.state.submissions.length, 0);
        await input.setInputFiles(file("courses"));
        await dialog.getByRole("list", { name: "Import preview" }).waitFor();
        f.state.submitFailure = true;
        await dialog.getByRole("button", { name: "Confirm import" }).click();
        await dialog.getByRole("alert").waitFor();
        f.state.submitFailure = false;
        await dialog.getByRole("button", { name: "Confirm import" }).click();
        await dialog.getByText("Import in progress", { exact: true }).waitFor();
        assert.deepEqual(f.state.submissions[0], f.state.submissions[1]);
        await f.page.keyboard.press("Escape");
        await dialog.waitFor({ state: "hidden" });
        assert.deepEqual(f.errors, []);
    } finally {
        await f.context.close();
    }
});
test("failed preview can retry without file reselection and completed rows survive a status outage", async () => {
    const f = await importFixture(browser);
    try {
        await f.page.goto(f.origin + "/admin/courses");
        await f.page.getByRole("button", { name: "Add Courses", exact: true }).click();
        const d = f.page.getByRole("dialog");
        f.state.previewFailure = true;
        await d.getByLabel("CSV file", { exact: true }).setInputFiles(file("courses"));
        await d.getByRole("button", { name: "Retry preview" }).waitFor();
        f.state.previewFailure = false;
        await d.getByRole("button", { name: "Retry preview" }).click();
        await d.getByRole("list", { name: "Import preview" }).waitFor();
        f.state.progress = true;
        await d.getByRole("button", { name: "Confirm import" }).click();
        await d.getByText("Import in progress", { exact: true }).waitFor();
        f.state.readFailure = true;
        await d.getByRole("alert").waitFor();
        await d.getByText("updated", { exact: true }).waitFor();
        assert.equal(
            await d.getByRole("list", { name: "Import results" }).locator("li").count(),
            3,
        );
        f.state.readFailure = false;
        await d.getByRole("button", { name: "Try again" }).click();
        await d.getByRole("alert").waitFor({ state: "hidden" });
        assert.deepEqual(f.errors, []);
    } finally {
        await f.context.close();
    }
});
test("a thousand-row preview keeps actions reachable and restores keyboard focus at 320px", async () => {
    const f = await importFixture(browser, { width: 320 });
    try {
        await f.page.emulateMedia({ reducedMotion: "reduce" });
        await f.page.goto(f.origin + "/admin/courses");
        const opener = f.page.getByRole("button", { name: "Add Courses", exact: true });
        await opener.click();
        const d = f.page.getByRole("dialog");
        const text =
            "code,name\n" +
            Array.from(
                { length: 1000 },
                (_, i) => `QA${i},Course with a long descriptive name ${i}`,
            ).join("\n");
        await d
            .getByLabel("CSV file", { exact: true })
            .setInputFiles({ name: "large.csv", mimeType: "text/csv", buffer: Buffer.from(text) });
        const list = d.getByRole("list", { name: "Import preview" });
        await list.waitFor();
        assert.equal(await list.locator("li").count(), 1000);
        assert.ok(await list.evaluate((node) => node.scrollHeight > node.clientHeight));
        const button = d.getByRole("button", { name: "Confirm import" });
        const box = await button.boundingBox();
        assert.ok(box.x >= 0 && box.x + box.width <= 320 && box.y + box.height <= 900);
        await f.page.keyboard.press("Escape");
        await d.waitFor({ state: "hidden" });
        assert.equal(await opener.evaluate((node) => node === document.activeElement), true);
        assert.deepEqual(f.errors, []);
    } finally {
        await f.context.close();
    }
});
