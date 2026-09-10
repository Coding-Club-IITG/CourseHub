import assert from "node:assert/strict";
import { before, after, test } from "node:test";
import { chromium } from "playwright";
import { courseAdministrationFixture } from "./support/course-administration.js";
import { adminExperienceFixture } from "./support/admin-experience.js";
import { examFixture } from "./support/exams.js";

let browser;
before(async () => {
    browser = await chromium.launch({
        executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
    });
});
after(async () => browser?.close());

for (const width of [390, 1440]) {
    test(`Without BR combines with course filters, pagination and refresh at ${width}px`, async () => {
        const f = await courseAdministrationFixture(browser, { width, count: 24 });
        const { page, state } = f;
        try {
            await page.goto(
                f.origin +
                    "/admin/courses?withoutBR=true&q=%5Bliteral%5D&pageSize=10&page=2#content",
            );
            await page.getByText("12 results · Page 2 of 2").waitFor();
            const filter = page.getByRole("button", { name: "Without BR", exact: true });
            assert.equal(await filter.getAttribute("aria-pressed"), "true");
            assert.equal(
                await page.getByRole("link", { name: "Courses Without BR", exact: true }).count(),
                0,
            );
            assert.equal(
                await page.getByRole("button", { name: "Manage BRs", exact: true }).count(),
                0,
            );
            const refresh = page.getByRole("button", { name: "Refresh", exact: true });
            assert.match(await refresh.locator("..").innerText(), /Refresh\s+Add Courses/);
            await page.getByTitle("Edit course code and name").first().click();
            await page.getByRole("dialog").waitFor();
            await page.keyboard.press("Escape");
            await page.getByTitle("Delete course", { exact: true }).first().click();
            await page
                .getByRole("alertdialog")
                .getByRole("button", { name: "Cancel", exact: true })
                .click();
            state.items.forEach((item) => {
                item.withoutBR = false;
            });
            await refresh.click();
            await page.getByText("No courses found", { exact: true }).waitFor();
            await page.waitForURL((url) => url.searchParams.get("page") === "1");
            await page.getByRole("button", { name: "Reset filters", exact: true }).click();
            await page.getByText("24 results · Page 1 of 2").waitFor();
            assert.equal(new URL(page.url()).hash, "#content");
            state.items[1].withoutBR = true;
            state.items[1].duplicate = true;
            state.items[1].name = "";
            await filter.focus();
            await page.keyboard.press("Space");
            await page.getByText("1 results · Page 1 of 1").waitFor();
            await page.getByRole("button", { name: "Duplicate codes", exact: true }).click();
            await page.getByRole("button", { name: "Without names", exact: true }).click();
            await page.getByRole("textbox", { name: "Search courses" }).fill("QA002");
            await page.waitForURL((url) => url.searchParams.get("q") === "QA002");
            await page.getByText("QA002", { exact: true }).waitFor();
            assert.equal(state.lists.at(-1).withoutBR, "true");
            assert.equal(state.lists.at(-1).duplicates, "true");
            assert.equal(state.lists.at(-1).nameless, "true");
            assert.ok(
                await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
            );
            assert.deepEqual(f.errors, []);
        } finally {
            await f.context.close();
        }
    });

    test(`dashboard course cards open from their edges and keep removal separate at ${width}px`, async (t) => {
        const { page, frontend, user } = await examFixture(browser, t, { width });
        user.readOnly = [{ code: "QA999", name: "Optional course" }];
        for (const target of ["edge", "code", "title", "keyboard"]) {
            await page.goto(frontend + "/dashboard");
            const card = page.locator("article.coursecard").filter({ hasText: "RT5022" });
            await card.scrollIntoViewIfNeeded();
            if (target === "edge") {
                const box = await card.boundingBox();
                await page.mouse.click(box.x + box.width - 5, box.y + box.height - 5);
            } else if (target === "keyboard") {
                await card.getByRole("button").focus();
                await page.keyboard.press("Enter");
            } else if (target === "code") await card.getByText("RT5022", { exact: true }).click();
            else await card.locator(".name").click();
            await page.waitForURL("**/browse/RT5022");
        }
        await page.goto(frontend + "/dashboard");
        const optional = page.locator("article.coursecard").filter({ hasText: "QA999" });
        await optional.getByRole("button", { name: "Remove course", exact: true }).click();
        const dialog = page.getByRole("alertdialog");
        await dialog.waitFor();
        assert.equal(new URL(page.url()).pathname, "/dashboard");
        await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
        assert.ok(await optional.isVisible());
    });

    test(`countdowns focus and scroll to their exam schedule at ${width}px`, async (t) => {
        const { page, frontend, requests } = await examFixture(browser, t, { width });
        await page.goto(frontend + "/dashboard");
        for (const [label, tab, interaction] of [
            ["End-Sem", "End-Sem", "click"],
            ["Mid-Sem", "Mid-Sem", "Enter"],
            ["End-Sem", "End-Sem", "Space"],
        ]) {
            const counter = page.getByRole("button", {
                name: label + " Exam countdown",
                exact: true,
            });
            await counter.scrollIntoViewIfNeeded();
            if (interaction === "click") await counter.click();
            else {
                await counter.focus();
                await page.keyboard.press(interaction);
            }
            const schedule = page.getByRole("region", { name: "Exam schedule", exact: true });
            await page.waitForFunction(() => {
                const active = document.activeElement;
                const rect = active?.getBoundingClientRect();
                return (
                    active?.id === "exam-schedule" && rect.top >= 0 && rect.bottom <= innerHeight
                );
            });
            assert.equal(
                await schedule
                    .getByRole("button", { name: tab, exact: true })
                    .getAttribute("aria-pressed"),
                "true",
            );
            assert.ok(
                await page.evaluate(
                    () => scrollY > 0 && document.documentElement.scrollWidth <= innerWidth,
                ),
            );
        }
        await page.emulateMedia({ reducedMotion: "reduce" });
        await page.evaluate(() => {
            const original = Element.prototype.scrollIntoView;
            Element.prototype.scrollIntoView = function (options) {
                if (this.id === "exam-schedule") window.scheduleScroll = options;
                return original.call(this, options);
            };
        });
        await page.getByRole("button", { name: "Mid-Sem Exam countdown", exact: true }).click();
        assert.equal(await page.evaluate(() => window.scheduleScroll.behavior), "instant");
        assert.equal(requests.filter((item) => item.path === "/api/event/examdates").length, 1);
    });
}

test("course coverage errors remain retryable and the removed route has no redirect", async () => {
    const f = await courseAdministrationFixture(browser);
    try {
        f.state.listFailure = true;
        await f.page.goto(f.origin + "/admin/courses?withoutBR=true");
        await f.page
            .getByRole("alert")
            .filter({ hasText: "Course coverage is unavailable" })
            .waitFor();
        assert.equal(await f.page.getByText("No courses found", { exact: true }).count(), 0);
        f.state.listFailure = false;
        await f.page.getByRole("button", { name: "Try again", exact: true }).click();
        await f.page.getByText("10 results · Page 1 of 1").waitFor();
        await f.page.goto(f.origin + "/admin/courses-without-br");
        await f.page.getByRole("heading", { name: "Page not found", exact: true }).waitFor();
        assert.equal(new URL(f.page.url()).pathname, "/admin/courses-without-br");
    } finally {
        await f.context.close();
    }
});

test("shared refresh controls preserve student confirmation and operation refetch", async () => {
    for (const scenario of ["students", "operations"]) {
        const f = await adminExperienceFixture(browser, { scenario });
        try {
            await f.page.goto(f.origin + "/admin/" + scenario, { waitUntil: "networkidle" });
            const requestCount = f.requests.filter(
                (item) => item.path === "/api/operations",
            ).length;
            await f.page
                .getByRole("button", {
                    name: scenario === "students" ? "Refresh all courses" : "Refresh",
                    exact: true,
                })
                .click();
            if (scenario === "students") {
                const dialog = f.page.getByRole("alertdialog");
                await dialog.waitFor();
                assert.ok(f.requests.every((item) => item.method === "GET"));
                await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
                await f.page.getByRole("button", { name: "BRs Only", exact: true }).click();
                await f.page.getByText("1 results · Page 1 of 1").waitFor();
                await f.page.getByRole("button", { name: "Reset filters", exact: true }).click();
                await f.page.getByText("3 results · Page 1 of 1").waitFor();
            } else {
                await f.page.waitForResponse(
                    (response) => new URL(response.url()).pathname === "/api/operations",
                );
                assert.ok(
                    f.requests.filter((item) => item.path === "/api/operations").length >
                        requestCount,
                );
            }
            assert.deepEqual(f.errors, []);
        } finally {
            await f.context.close();
        }
    }
});
