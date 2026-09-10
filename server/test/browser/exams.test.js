import assert from "node:assert/strict";
import { test, before, after } from "node:test";
import { chromium } from "playwright";
import { examFixture } from "./support/exams.js";
import { examResponse } from "../fixtures/exams.js";

let browser;
before(async () => {
    browser = await chromium.launch({
        headless: true,
        executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
    });
});
after(async () => browser?.close());
for (const width of [1440, 390]) {
    test(`one exam request supplies the countdowns and keyboard-switchable course list at ${width}px`, async (t) => {
        const { page, requests, frontend } = await examFixture(browser, t, { width });
        await page.goto(frontend + "/dashboard");
        await page
            .locator('[data-exam-type="midSem"] .days')
            .getByText("4", { exact: true })
            .waitFor();
        assert.equal(await page.locator('[data-exam-type="endSem"] .days').innerText(), "66");
        assert.match(await page.locator('[data-exam-type="midSem"]').innerText(), /Days for/);
        const schedule = page.getByRole("region", { name: "Exam schedule" });
        assert.deepEqual(await schedule.locator("time").allTextContents(), [
            "13 Sept 2026",
            "14 Sept 2026",
        ]);
        await schedule.getByRole("button", { name: "End-Sem", exact: true }).press("Enter");
        assert.equal(
            await schedule
                .getByRole("button", { name: "End-Sem", exact: true })
                .getAttribute("aria-pressed"),
            "true",
        );
        assert.deepEqual(await schedule.locator("time").allTextContents(), [
            "14 Nov 2026",
            "15 Nov 2026",
        ]);
        const exams = requests.filter((request) => request.path === "/api/event/examdates");
        assert.equal(exams.length, 1);
        assert.match(exams[0].cookie, /token=synthetic/);
    });
    test(`missing mappings retain known exams and their countdowns at ${width}px`, async (t) => {
        const { page, frontend } = await examFixture(browser, t, { width, scenario: "partial" });
        await page.goto(frontend + "/dashboard");
        await page.locator(".exam-item-card").first().waitFor();
        assert.equal(
            await page.getByText(/Some exam dates are unavailable|Missing dates:/).count(),
            0,
        );
        assert.equal(
            await page
                .getByRole("region", { name: "Exam schedule" })
                .getByRole("button", { name: "Try again" })
                .count(),
            0,
        );
        assert.equal(await page.locator(".exam-item-card").count(), 2);
        assert.equal(await page.locator('[data-exam-type="midSem"] .days').innerText(), "4");
        assert.equal(await page.locator('[data-exam-type="endSem"] .days').innerText(), "66");
        assert.match(await page.locator('[data-exam-type="midSem"]').innerText(), /Days for/);
        assert.equal(await page.getByText("Listed exams", { exact: true }).count(), 0);
        assert.equal(await page.getByText(/No Mid-Sem exams scheduled/).count(), 0);
    });
    test(`unavailable, empty and excluded exam data are distinct at ${width}px`, async (t) => {
        for (const scenario of ["unavailable", "empty", "excluded", "complete", "today"]) {
            const { page, frontend } = await examFixture(browser, t, { width, scenario });
            await page.goto(frontend + "/dashboard", { waitUntil: "networkidle" });
            if (scenario === "excluded") {
                assert.equal(await page.locator(".exam-card").count(), 0);
                assert.equal(await page.getByRole("region", { name: "Exam schedule" }).count(), 0);
            } else if (scenario === "unavailable") {
                await page.getByText("Mid-Sem schedule unavailable.", { exact: true }).waitFor();
                assert.equal(await page.getByText(/No Mid-Sem exams scheduled/).count(), 0);
            } else if (scenario === "empty")
                await page
                    .getByText("No Mid-Sem exams scheduled for your courses.", { exact: true })
                    .waitFor();
            else if (scenario === "complete")
                await page.getByText("All listed Mid-Sem exams have finished.").waitFor();
            else
                assert.equal(
                    await page.locator('[data-exam-type="midSem"] .days').innerText(),
                    "Today",
                );
            if (scenario !== "today") {
                assert.equal(await page.locator(".exam-card").count(), 0);
                assert.equal(await page.locator(".exam-card-container").count(), 0);
            }
        }
    });
    test(`loading and failed requests never show zero days, and retry restores the schedule at ${width}px`, async (t) => {
        const { page, frontend, state } = await examFixture(browser, t, {
            width,
            scenario: "loading",
        });
        await page.goto(frontend + "/dashboard");
        await page.getByText("Loading exam schedule…", { exact: true }).waitFor();
        assert.equal(await page.locator(".exam-card").count(), 0);
        state.status = 503;
        state.loading = false;
        state.release();
        await page
            .getByRole("alert")
            .getByText("Exam schedule could not be loaded.", { exact: true })
            .waitFor();
        assert.equal(await page.locator(".exam-card").count(), 0);
        state.status = 200;
        await page.getByRole("button", { name: "Try again" }).click();
        await page
            .locator('[data-exam-type="midSem"] .days')
            .getByText("4", { exact: true })
            .waitFor();
    });
    test(`a completed or unlisted exam type hides only its own countdown at ${width}px`, async (t) => {
        const { page, frontend, state } = await examFixture(browser, t, {
            width,
            scenario: "partial",
        });
        state.data.refreshAfterMs = 1000;
        await page.goto(frontend + "/dashboard", { waitUntil: "networkidle" });
        assert.equal(await page.locator(".exam-card").count(), 2);
        state.data.exams.midSem.nextExam.daysUntil = 1;
        await page.clock.fastForward(1001);
        await page.getByText("Day for", { exact: true }).waitFor();
        state.data.exams.midSem.nextExam = null;
        for (const item of state.data.exams.midSem.items) item.state = "finished";
        await page.clock.fastForward(1001);
        await page.locator('[data-exam-type="midSem"]').waitFor({ state: "detached" });
        assert.equal(await page.locator('[data-exam-type="endSem"] .days').innerText(), "66");
        assert.equal(await page.locator(".exam-item-card").count(), 2);
        state.data.exams.endSem = {
            status: "unavailable",
            items: [],
            missingCourses: [{ code: "QA999", name: "Unknown date" }],
            nextExam: null,
        };
        await page.clock.fastForward(1001);
        await page.locator(".exam-card-container").waitFor({ state: "detached" });
        assert.equal(await page.locator(".exam-card").count(), 0);
    });
}
test("an open dashboard refreshes countdown boundaries and discards a timetable after semester rollover", async (t) => {
    const { page, frontend, state, requests } = await examFixture(browser, t);
    state.data.refreshAfterMs = 1000;
    await page.goto(frontend + "/dashboard", { waitUntil: "networkidle" });
    state.data.exams.midSem.nextExam.daysUntil = 0;
    await page.clock.fastForward(1001);
    await page
        .locator('[data-exam-type="midSem"] .days')
        .getByText("Today", { exact: true })
        .waitFor();
    state.data.exams.midSem.nextExam.state = "ongoing";
    await page.clock.fastForward(1001);
    await page
        .locator('[data-exam-type="midSem"] .days')
        .getByText("Now", { exact: true })
        .waitFor();
    state.data = {
        ...state.data,
        status: "unavailable",
        reason: "SCHEDULE_UNAVAILABLE",
        period: { year: 2027, session: "Jan-May" },
        exams: {},
    };
    await page.clock.fastForward(1001);
    await page.getByText("Mid-Sem schedule unavailable.", { exact: true }).waitFor();
    assert.equal(await page.locator(".exam-item-card").count(), 0);
    assert.equal(await page.locator(".exam-card").count(), 0);
    assert.ok(requests.filter((request) => request.path === "/api/event/examdates").length >= 4);
});
test("a different browser timezone does not change the returned exam date or countdown", async (t) => {
    const { page, frontend } = await examFixture(browser, t, { timezone: "America/Los_Angeles" });
    await page.goto(frontend + "/dashboard", { waitUntil: "networkidle" });
    assert.equal(await page.locator('[data-exam-type="midSem"] .days').innerText(), "4");
    assert.equal(await page.locator(".exam-item-card time").first().innerText(), "13 Sept 2026");
});
test("malformed schedule data produces a retryable error, not a false empty list", async (t) => {
    const { page, frontend, state } = await examFixture(browser, t);
    state.data = { status: "ready", exams: {} };
    await page.goto(frontend + "/dashboard");
    await page.getByRole("alert").getByText("Exam schedule could not be loaded.").waitFor();
    state.data = structuredClone(examResponse);
    await page.getByRole("button", { name: "Try again" }).click();
    await page.locator('[data-exam-type="midSem"] .days').getByText("4", { exact: true }).waitFor();
});
test("signed-out dashboard navigation does not request an exam schedule", async (t) => {
    const { page, frontend, state, requests } = await examFixture(browser, t);
    state.signedIn = false;
    await page.goto(frontend + "/dashboard");
    await page.waitForURL("**/?returnTo=*");
    assert.equal(
        requests.some((request) => request.path === "/api/event/examdates"),
        false,
    );
});
