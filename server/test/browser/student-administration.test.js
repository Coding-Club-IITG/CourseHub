import assert from "node:assert/strict";
import { before, after, test } from "node:test";
import { chromium } from "playwright";
import { studentAdministrationFixture } from "./support/student-administration.js";
let browser;
before(async () => {
    browser = await chromium.launch({
        executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
    });
});
after(async () => browser?.close());
for (const width of [390, 1440])
    test(`student pagination fetches details on demand and retains failed deletion at ${width}px`, async () => {
        const f = await studentAdministrationFixture(browser, { width, count: 21 });
        try {
            await f.page.goto(f.origin + "/admin/students");
            await f.page.getByRole("button", { name: "Details", exact: true }).first().waitFor();
            assert.equal(f.state.lists.length, 1);
            assert.equal(f.state.details.length, 0);
            await f.page.getByRole("button", { name: "Next", exact: true }).click();
            await f.page.getByText("21 results · Page 2 of 2", { exact: true }).waitFor();
            assert.equal(
                await f.page.getByRole("button", { name: "Details", exact: true }).count(),
                1,
            );
            await f.page.getByRole("button", { name: "Details", exact: true }).click();
            await f.page.getByRole("heading", { name: "Current registered courses" }).waitFor();
            assert.equal(f.state.details.length, 1);
            f.state.failAction = true;
            await f.page.getByRole("button", { name: "Delete student", exact: true }).click();
            const dialog = f.page.getByRole("alertdialog");
            await dialog.getByRole("button", { name: "Delete", exact: true }).click();
            await dialog.getByRole("alert").waitFor();
            assert.equal(f.state.users.length, 21);
            f.state.failAction = false;
            await dialog.getByRole("button", { name: "Delete", exact: true }).click();
            await dialog.waitFor({ state: "hidden" });
            await f.page.getByText("20 results · Page 1 of 1", { exact: true }).waitFor();
            assert.ok(
                await f.page
                    .getByRole("status")
                    .filter({ hasText: "Student profile deleted" })
                    .isVisible(),
            );
            assert.ok(
                await f.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
            );
            assert.deepEqual(f.errors, []);
        } finally {
            await f.context.close();
        }
    });
test("changing BR filters and resetting a pending search cannot restore a stale student list", async () => {
    const f = await studentAdministrationFixture(browser, { width: 390 });
    let release;
    try {
        await f.page.goto(f.origin + "/admin/students");
        const input = f.page.getByRole("textbox", { name: "Search students" });
        await f.page.getByRole("button", { name: "Details", exact: true }).first().waitFor();
        f.state.hold = new Promise((resolve) => (release = resolve));
        f.state.holdQuery = "Student 01";
        await input.fill("Student 01");
        await f.page.waitForFunction(() =>
            document.querySelector("body").textContent.includes("Loading students"),
        );
        await f.page.getByRole("button", { name: "BRs Only", exact: true }).click();
        await f.page.getByRole("button", { name: "Reset filters", exact: true }).click();
        await f.page.getByText("25 results · Page 1 of 2", { exact: true }).waitFor();
        release();
        f.state.hold = null;
        assert.equal(await input.inputValue(), "");
        assert.equal(
            await f.page
                .getByRole("button", { name: "All Students", exact: true })
                .getAttribute("aria-pressed"),
            "true",
        );
        assert.equal(
            await f.page.getByRole("button", { name: "Details", exact: true }).count(),
            20,
        );
        assert.deepEqual(f.errors, []);
    } finally {
        release?.();
        await f.context.close();
    }
});
test("pending BRs omit student-only actions and BR/refresh failures keep confirmations open", async () => {
    const f = await studentAdministrationFixture(browser, { width: 1440 });
    try {
        await f.page.goto(f.origin + "/admin/students?isBR=true");
        await f.page.getByText("pending@example.test", { exact: true }).waitFor();
        const row = f.page.getByRole("row").filter({ hasText: "pending@example.test" });
        assert.equal(
            await row.getByRole("button", { name: "Delete student", exact: true }).count(),
            0,
        );
        assert.equal(await row.getByRole("button", { name: "Details", exact: true }).count(), 0);
        await row.getByRole("button", { name: "Remove BR", exact: true }).click();
        let dialog = f.page.getByRole("alertdialog");
        await dialog.getByRole("button", { name: "Remove BR", exact: true }).click();
        await dialog.getByRole("alert").waitFor();
        await f.page.keyboard.press("Escape");
        await dialog.waitFor({ state: "hidden" });
        await f.page.getByRole("button", { name: "Refresh courses", exact: true }).first().click();
        dialog = f.page.getByRole("alertdialog");
        await dialog.getByRole("button", { name: "Refresh", exact: true }).click();
        await dialog.getByRole("alert").waitFor();
        assert.equal(f.state.mutations.filter((value) => value === "refresh").length, 1);
        assert.deepEqual(f.errors, []);
    } finally {
        await f.context.close();
    }
});
test("adding a BR retains a failed email and confirms the saved assignment only after persistence", async () => {
    const f = await studentAdministrationFixture(browser);
    let fail = true;
    try {
        await f.page.route("**/api/br/create", (route) =>
            route.fulfill({
                status: fail ? 503 : 201,
                json: fail
                    ? { message: "Assignment could not be saved. Please retry." }
                    : {
                          br: { email: "new-br@example.test" },
                          synchronization: { operationId: "assigned-sync" },
                      },
            }),
        );
        await f.page.goto(f.origin + "/admin/students?isBR=true");
        await f.page.getByRole("button", { name: "Add BRs", exact: true }).click();
        const dialog = f.page.getByRole("dialog");
        await dialog.getByRole("textbox", { name: "Email address" }).fill("new-br@example.test");
        await dialog.getByRole("button", { name: "Add BR", exact: true }).click();
        await dialog.getByRole("alert").waitFor();
        assert.equal(
            await dialog.getByRole("textbox", { name: "Email address" }).inputValue(),
            "new-br@example.test",
        );
        fail = false;
        await dialog.getByRole("button", { name: "Add BR", exact: true }).click();
        await dialog
            .getByRole("status")
            .filter({ hasText: "synchronization is scheduled" })
            .waitFor();
        assert.deepEqual(f.errors, []);
    } finally {
        await f.context.close();
    }
});
