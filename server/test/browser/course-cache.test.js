import { unavailableExamResponse } from "../fixtures/exams.js";
import assert from "node:assert/strict";
import { before, after, test } from "node:test";
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { student, course, year, folder, libraryFile } from "../fixtures/library.js";
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || "playwright");
const frontend = process.env.BROWSER_CLIENT_ORIGIN || "http://127.0.0.1:5173";
const api = process.env.BROWSER_API_ORIGIN || "http://127.0.0.1:4185";
let browser;
before(async () => {
    browser = await chromium.launch({
        headless: true,
        executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
    });
});
after(async () => browser?.close());
async function fixture(t, width = 1440) {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    const requests = [],
        errors = [],
        pages = [];
    const state = {
        authenticated: true,
        empty: false,
        files: true,
        name: "Shared notes",
        version: 1,
        status: 200,
        hold: null,
    };
    const actor = {
        ...student,
        isBR: true,
        courses: [course, { code: "MA101", name: "Mathematics" }],
        capabilities: {
            canManageCourses: ["CS101", "MA101"],
            canContributeCourses: ["CS101", "MA101"],
        },
    };
    const tree = (code) => ({
        ...course,
        code,
        revision: String(state.version),
        found: true,
        children: state.empty
            ? []
            : [
                  {
                      ...year,
                      capabilities: { canManage: true },
                      children: [
                          {
                              ...folder,
                              name: state.name,
                              affectedCourses: ["CS101", "MA101"],
                              capabilities: { canManage: true, canContribute: true },
                              children: state.files
                                  ? [
                                        {
                                            ...libraryFile,
                                            thumbnail: {},
                                            affectedCourses: ["CS101", "MA101"],
                                            capabilities: { canManage: true },
                                        },
                                    ]
                                  : [],
                          },
                      ],
                  },
              ],
    });
    await context.route("**/api/**", async (route) => {
        const url = new URL(route.request().url()),
            method = route.request().method();
        if (!url.pathname.startsWith("/api/")) return route.continue();
        requests.push({ path: url.pathname, method });
        let status = 200,
            data = {};
        if (url.pathname === "/api/user") {
            status = state.authenticated ? 200 : 401;
            data = { ...actor, csrfToken: "c".repeat(43) };
        } else if (url.pathname === "/api/auth/logout") {
            state.authenticated = false;
            data = { success: true };
        } else if (url.pathname === "/api/auth/csrf") data = { csrfToken: "c".repeat(43) };
        else if (url.pathname.startsWith("/api/course/")) {
            const code = url.pathname.split("/").at(-1);
            const snapshot = tree(code);
            if (code === "CS101" && state.hold) await state.hold;
            status = state.status;
            data = status === 200 ? snapshot : { message: "Course unavailable" };
        } else if (url.pathname === "/api/folder/rename") {
            state.name = JSON.parse(route.request().postData()).newName;
            state.version++;
            data = {
                ...tree("MA101").children[0].children[0],
                affectedCourses: ["CS101", "MA101"],
            };
        } else if (url.pathname === "/api/operations") data = { items: [] };
        else if (url.pathname === "/api/contribution/limits")
            data = { fileBytes: 104857600, batchBytes: 1073741824, files: 40, concurrentFiles: 2 };
        else if (url.pathname === "/api/event/examdates") data = unavailableExamResponse;
        else if (url.pathname === "/api/contribution/") data = [];
        else if (url.pathname.startsWith("/api/folder/content/"))
            data = tree("CS101").children[0]?.children[0];
        else status = 404;
        await route
            .fulfill({
                status,
                contentType: "application/json",
                body: JSON.stringify(data),
                headers: {
                    "access-control-allow-origin": frontend,
                    "access-control-allow-credentials": "true",
                },
            })
            .catch(() => {});
    });
    const newPage = async () => {
        const page = await context.newPage();
        page.setDefaultTimeout(8000);
        page.on("pageerror", (error) => errors.push(error.message));
        pages.push(page);
        await page.clock.install({ time: new Date("2026-09-08T06:30:00Z") });
        return page;
    };
    t.after(async () => {
        if (process.env.BROWSER_ARTIFACT_DIR) {
            fs.mkdirSync(process.env.BROWSER_ARTIFACT_DIR, { recursive: true });
            for (const [i, page] of pages.entries())
                await page.screenshot({
                    path: path.join(
                        process.env.BROWSER_ARTIFACT_DIR,
                        t.name.replace(/[^a-z0-9-]+/gi, "-") + (i ? "-tab2" : "") + ".png",
                    ),
                    fullPage: true,
                });
        }
        await context.close();
        assert.deepEqual(errors, []);
    });
    return { page: await newPage(), newPage, state, requests };
}
for (const width of [1440, 390]) {
    test(`removing the final year replaces cached content with a valid empty course at ${width}px`, async (t) => {
        const { page, state } = await fixture(t, width);
        await page.goto(frontend + "/browse/CS101");
        await page.locator(".browse-folder").first().waitFor();
        state.empty = true;
        state.version++;
        await page.clock.runFor(31_000);
        await page.getByText("No data available for this course", { exact: true }).waitFor();
        assert.equal(await page.locator(".browse-folder").count(), 0);
    });
    test(`removing the final file refreshes an open folder without reloading at ${width}px`, async (t) => {
        const { page, state } = await fixture(t, width);
        await page.goto(frontend + `/browse/CS101/${folder._id}`);
        await page.getByTitle(libraryFile.name, { exact: true }).first().waitFor();
        state.files = false;
        state.version++;
        await page.clock.runFor(31_000);
        await page
            .getByText(/No files (available|have been)/)
            .first()
            .waitFor();
        assert.equal(await page.getByTitle(libraryFile.name, { exact: true }).count(), 0);
    });
    test(`course browsing works when persistent browser storage is denied at ${width}px`, async (t) => {
        const { page } = await fixture(t, width);
        await page.addInitScript(() => {
            for (const key of ["localStorage", "sessionStorage"])
                Object.defineProperty(window, key, {
                    get() {
                        throw new DOMException("Storage unavailable", "SecurityError");
                    },
                });
        });
        await page.goto(frontend + `/browse/CS101/${folder._id}?file=selected#preview`);
        await page.getByTitle(libraryFile.name, { exact: true }).first().waitFor();
        assert.equal(
            new URL(page.url()).search + new URL(page.url()).hash,
            "?file=selected#preview",
        );
    });
}
test("folder navigation and reload restore the selected year without separate tree copies", async (t) => {
    const { page, requests } = await fixture(t);
    await page.goto(frontend + `/browse/CS101/${year._id}`);
    await page.locator(".browse-folder").first().getByRole("button").first().click();
    await page.waitForURL(`**/browse/CS101/${folder._id}`);
    await page.getByTitle(libraryFile.name, { exact: true }).first().waitFor();
    assert.equal(requests.filter((item) => item.path === "/api/course/CS101").length, 1);
    await page.reload();
    await page.getByTitle(libraryFile.name, { exact: true }).first().waitFor();
    assert.equal(new URL(page.url()).pathname, `/browse/CS101/${folder._id}`);
    await page.goBack();
    await page.waitForURL(`**/browse/CS101/${year._id}`);
    await page.locator(".browse-folder").first().waitFor();
});
test("a folder rename in another tab refreshes both shared courses", async (t) => {
    const { page, newPage, requests } = await fixture(t);
    await page.goto(frontend + "/browse/CS101");
    await page.locator(".browse-folder").first().waitFor();
    const second = await newPage();
    await second.goto(frontend + "/browse/MA101");
    await second.locator(".browse-folder .rename-tick").click();
    await second.getByRole("textbox", { name: /^Folder name/ }).fill("Renamed in another course");
    await second.getByRole("textbox", { name: /^Folder name/ }).press("Enter");
    for (const tab of [page, second])
        await tab
            .locator(".browse-folder .name")
            .filter({ hasText: "Renamed in another course" })
            .waitFor();
    for (const code of ["CS101", "MA101"])
        assert.ok(requests.filter((item) => item.path === "/api/course/" + code).length >= 2);
});
test("a stale course response cannot replace the newly selected course", async (t) => {
    const { page, state, requests } = await fixture(t);
    let release;
    state.hold = new Promise((resolve) => {
        release = resolve;
    });
    await page.goto(frontend + "/dashboard");
    await page.locator(".coursecard").filter({ hasText: "CS101" }).locator(":scope > button").first().click();
    await page.getByText("Loading course data...", { exact: true }).waitFor();
    await page.getByRole("navigation", {name:"Main navigation"}).getByRole("link", {name:"Dashboard", exact:true}).click();
    await page.locator(".coursecard").filter({ hasText: "MA101" }).locator(":scope > button").first().click();
    await page.locator(".browse-folder").first().waitFor();
    release();
    state.hold = null;
    assert.equal(new URL(page.url()).pathname, "/browse/MA101");
    assert.ok(requests.some((item) => item.path === "/api/course/MA101"));
    assert.equal(await page.locator(".collapsible.true .code").innerText(), "MA101");
});
test("an inaccessible folder is explicit and can recover without losing its URL", async (t) => {
    const { page, state } = await fixture(t);
    state.empty = true;
    await page.goto(frontend + `/browse/CS101/${folder._id}?file=selected#preview`);
    await page.getByText("This folder is unavailable.", { exact: true }).waitFor();
    state.empty = false;
    state.version++;
    await page.getByRole("button", { name: "Try again" }).click();
    await page.getByTitle(libraryFile.name, { exact: true }).first().waitFor();
    assert.equal(new URL(page.url()).search + new URL(page.url()).hash, "?file=selected#preview");
});
test("logout in another tab clears visible library data and preserves the destination", async (t) => {
    const { page, newPage } = await fixture(t);
    await page.goto(frontend + `/browse/CS101/${folder._id}?file=selected#preview`);
    await page.getByTitle(libraryFile.name, { exact: true }).first().waitFor();
    const second = await newPage();
    await second.goto(frontend + "/browse/MA101");
    await second.locator(".browse-folder").first().waitFor();
    await second.getByRole("button", {name:"Log Out", exact:true}).click();
    await page.waitForURL("**/?returnTo=*");
    assert.equal(
        new URL(page.url()).searchParams.get("returnTo"),
        `/browse/CS101/${folder._id}?file=selected#preview`,
    );
    assert.equal(await page.getByTitle(libraryFile.name, { exact: true }).count(), 0);
});
