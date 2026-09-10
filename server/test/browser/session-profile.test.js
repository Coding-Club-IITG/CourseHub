import { unavailableExamResponse } from "../fixtures/exams.js";
import { linkingOperation } from "../fixtures/linking.js";
import assert from "node:assert/strict";
import { test, before, after } from "node:test";
import { createRequire } from "node:module";
import { student } from "../fixtures/library.js";
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || "playwright");
const frontend = process.env.BROWSER_CLIENT_ORIGIN || "http://127.0.0.1:4186";
const api = process.env.BROWSER_API_ORIGIN || "http://127.0.0.1:4185";
const adminOrigin = process.env.BROWSER_ADMIN_ORIGIN || "http://127.0.0.1:4184";
const csrf = "c".repeat(43);
let browser;
before(async () => {
    browser = await chromium.launch({
        headless: true,
        executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
    });
});
after(async () => browser?.close());

async function studentPage(
    t,
    { width = 1440, signedIn = true, save, logout, csrfMismatch = false } = {},
) {
    const context = await browser.newContext({
        viewport: { width, height: 900 },
        locale: "en-US",
        timezoneId: "Asia/Kolkata",
    });
    const page = await context.newPage();
    const errors = [],
        requests = [];
    let authenticated = signedIn;
    let name = student.name;
    if (signedIn)
        await context.addCookies([
            {
                name: "token",
                value: "synthetic-session",
                url: api,
                httpOnly: true,
                sameSite: "Lax",
            },
        ]);
    page.on("pageerror", (e) => errors.push(e.message));
    t.after(async () => {
        await context.close();
        assert.deepEqual(errors, []);
    });
    await context.route("**/*", async (route) => {
        const request = route.request(),
            url = new URL(request.url());
        if (url.origin === frontend) return route.continue();
        if (url.origin !== api) return route.abort();
        const headers = await request.allHeaders();
        requests.push({
            path: url.pathname,
            method: request.method(),
            headers,
            body: request.postData(),
        });
        let status = 200,
            data = {};
        if (url.pathname === "/api/user") {
            status = authenticated ? 200 : 401;
            data = authenticated
                ? { ...student, name, csrfToken: csrfMismatch ? "s".repeat(43) : csrf }
                : { message: "Sign in to continue" };
        } else if (url.pathname === "/api/auth/csrf") data = { csrfToken: csrf };
        else if (url.pathname === "/api/contribution/") data = [];
        else if (url.pathname === "/api/operations") data = { items: [], total: 0 };
        else if (url.pathname === "/api/user/update") {
            assert.ok(headers.cookie?.includes("token=synthetic-session"));
            assert.equal(headers.authorization, undefined);
            assert.equal(headers["x-session-role"], "student");
            if (headers["x-csrf-token"] !== csrf) {
                status = 403;
                data = { code: "CSRF_INVALID", message: "Refresh your session" };
            } else {
                const result = await save?.(JSON.parse(request.postData()));
                status = result?.status || 200;
                data = result?.data || {
                    name: JSON.parse(request.postData()).newUserData.newUserName,
                    semester: student.semester,
                };
                if (status === 200) name = data.name;
            }
        } else if (url.pathname === "/api/auth/logout") {
            assert.equal(request.method(), "POST");
            assert.equal(headers["x-csrf-token"], csrf);
            const result = await logout?.();
            status = result?.status || 200;
            data = status === 200 ? { success: true } : { message: "Unavailable" };
            if (status === 200) authenticated = false;
        } else if (url.pathname === "/api/auth/login") {
            authenticated = true;
            await context.addCookies([
                {
                    name: "token",
                    value: "synthetic-session",
                    url: api,
                    httpOnly: true,
                    sameSite: "Lax",
                },
            ]);
            return route.fulfill({
                status: 302,
                headers: { location: frontend + url.searchParams.get("returnTo") },
            });
        } else if (url.pathname === "/api/event/examdates") data = unavailableExamResponse;
        else return route.fulfill({ status: 404, contentType: "application/json", body: "{}" });
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
    return { page, requests };
}

for (const width of [1440, 390]) {
    test(`profile waits for confirmed persistence and uses the server-saved name at ${width}px`, async (t) => {
        let release;
        const waiting = new Promise((resolve) => {
            release = resolve;
        });
        const { page, requests } = await studentPage(t, {
            width,
            save: async () => {
                await waiting;
                return { data: { name: "Confirmed Student", semester: student.semester } };
            },
        });
        await page.goto(frontend + "/profile");
        await page.getByRole("button", { name: "Edit name", exact: true }).click();
        await page.getByRole("textbox", { name: "Name", exact: true }).fill("Requested Student");
        await page.getByRole("button", { name: "Save name", exact: true }).click();
        await page
            .getByRole("button", { name: "Save name", exact: true })
            .and(page.locator("[aria-busy=true]"))
            .waitFor();
        assert.equal(
            await page.getByRole("textbox", { name: "Name", exact: true }).inputValue(),
            "Requested Student",
        );
        assert.ok(await page.getByRole("button", { name: "Save name", exact: true }).isDisabled());
        assert.equal(await page.getByText("Profile updated", { exact: true }).count(), 0);
        release();
        await page.getByText("Profile updated", { exact: true }).waitFor();
        await page
            .getByRole("heading", { level: 2 })
            .filter({ hasText: "Confirmed Student" })
            .waitFor();
        assert.equal(requests.filter((r) => r.path === "/api/user/update").length, 1);
    });
    test(`failed profile save retains edits and supports keyboard retry at ${width}px`, async (t) => {
        let attempts = 0;
        const { page } = await studentPage(t, {
            width,
            save: () =>
                ++attempts === 1
                    ? { status: 503, data: { message: "The service is temporarily unavailable." } }
                    : undefined,
        });
        await page.goto(frontend + "/profile");
        await page.getByRole("button", { name: "Edit name", exact: true }).click();
        const input = page.getByRole("textbox", { name: "Name", exact: true });
        await input.fill("Retained Student");
        await input.press("Enter");
        await page
            .getByRole("alert")
            .filter({ hasText: "The service is temporarily unavailable." })
            .waitFor();
        assert.equal(await input.inputValue(), "Retained Student");
        assert.equal(await page.getByText("Profile updated", { exact: true }).count(), 0);
        await input.press("Enter");
        await page.getByText("Profile updated", { exact: true }).waitFor();
        assert.equal(attempts, 2);
    });
    test(`sign-in preserves a profile destination with query and hash at ${width}px`, async (t) => {
        const { page } = await studentPage(t, { width, signedIn: false });
        const destination = "/profile?tab=contributions#pending";
        await page.goto(frontend + destination);
        await page.getByText("Sign in with Microsoft", { exact: false }).waitFor();
        assert.equal(new URL(page.url()).searchParams.get("returnTo"), destination);
        await page.getByText("Sign in with Microsoft", { exact: false }).click();
        await page.getByRole("button", { name: "Edit name", exact: true }).waitFor();
        assert.equal(page.url(), frontend + destination);
    });
}

test("a CSRF token from a previous session is refreshed after rejection before retrying the save", async (t) => {
    const { page, requests } = await studentPage(t, { csrfMismatch: true });
    await page.goto(frontend + "/profile");
    await page.getByRole("button", { name: "Edit name", exact: true }).click();
    await page.getByRole("textbox", { name: "Name", exact: true }).fill("Fresh Session");
    await page.getByRole("button", { name: "Save name", exact: true }).click();
    await page.getByText("Profile updated", { exact: true }).waitFor();
    const saves = requests.filter((r) => r.path === "/api/user/update");
    assert.equal(saves.length, 2);
    assert.equal(saves[0].headers["x-csrf-token"], "s".repeat(43));
    assert.equal(saves[1].headers["x-csrf-token"], csrf);
});

test("logout failure keeps the student signed in until a successful POST response", async (t) => {
    let attempts = 0;
    const { page } = await studentPage(t, {
        logout: () => ({ status: ++attempts === 1 ? 503 : 200 }),
    });
    await page.goto(frontend + "/profile");
    await page.getByText("Log Out", { exact: true }).first().click();
    await page.getByText("Could not log out. Please try again.", { exact: true }).waitFor();
    assert.equal(new URL(page.url()).pathname, "/profile");
    await page.getByText("Log Out", { exact: true }).first().click();
    await page.getByText("Sign in with Microsoft", { exact: false }).waitFor();
    assert.equal(new URL(page.url()).pathname, "/");
});

for (const width of [1440, 390])
    test(`administrator login preserves destination and submits CSRF-protected linking at ${width}px`, async (t) => {
        const context = await browser.newContext({ viewport: { width, height: 900 } });
        const page = await context.newPage();
        let authenticated = false;
        const requests = [],
            errors = [];
        page.on("pageerror", (e) => errors.push(e.message));
        t.after(async () => {
            await context.close();
            assert.deepEqual(errors, []);
        });
        await context.route("**/*", async (route) => {
            const request = route.request(),
                url = new URL(request.url());
            if (url.origin !== adminOrigin) return route.abort();
            if (!url.pathname.startsWith("/api/")) return route.continue();
            const headers = await request.allHeaders();
            requests.push({ path: url.pathname, method: request.method(), headers });
            let status = 200,
                data = {};
            if (url.pathname === "/api/admin/") {
                status = authenticated ? 200 : 401;
                data = { csrfToken: csrf, user: { userId: "synthetic-admin" } };
            } else if (url.pathname === "/api/admin/auth/login") {
                authenticated = true;
                await context.addCookies([
                    {
                        name: "adminToken",
                        value: "synthetic-admin",
                        url: adminOrigin,
                        httpOnly: true,
                        sameSite: "Lax",
                    },
                ]);
                data = { success: true, csrfToken: csrf };
            } else if (url.pathname === "/api/auth/csrf") data = { csrfToken: csrf };
            else if (url.pathname.endsWith("/link") || url.pathname.endsWith("/bulk-link")) {
                assert.ok(headers.cookie?.includes("adminToken=synthetic-admin"));
                assert.equal(headers["x-csrf-token"], csrf);
                assert.equal(headers.authorization, undefined);
                const operation = linkingOperation();
                status = 202;
                const accepted = { operationId: operation.id, kind: "link", status: "queued" };
                data = url.pathname.endsWith("/bulk-link")
                    ? {
                          summary: {
                              scheduled: 1,
                              failed: 0,
                              errors: [],
                              operations: [{ oldCode: "CS101", newCode: "CSN101", ...accepted }],
                          },
                      }
                    : accepted;
                if (url.pathname.endsWith("/bulk-link"))
                    assert.match(headers["content-type"], /^multipart\/form-data; boundary=/);
            } else if (url.pathname.startsWith("/api/operations/")) data = linkingOperation();
            else {
                status = 404;
            }
            return route.fulfill({
                status,
                contentType: "application/json",
                body: JSON.stringify(data),
            });
        });
        const destination = "/admin/course-linking?mode=manual#courses";
        await page.goto(adminOrigin + destination);
        await page.getByRole("button", { name: "Sign In", exact: true }).waitFor();
        assert.equal(new URL(page.url()).searchParams.get("returnTo"), destination);
        await page.getByPlaceholder("admin id").fill("synthetic-admin");
        await page.locator("input[type=password]").fill("synthetic-password");
        await page.getByRole("button", { name: "Sign In", exact: true }).click();
        await page.getByRole("heading", { name: "Course Linking", exact: true }).waitFor();
        assert.equal(page.url(), adminOrigin + destination);
        await page.getByPlaceholder("Eg. CS101", { exact: true }).fill("CS101");
        await page.getByPlaceholder("Eg. CSN101", { exact: true }).fill("CSN101");
        await page.getByRole("button", { name: "Link Course", exact: true }).click();
        await page.getByText("Linking completed", { exact: true }).waitFor();
        await page.getByRole("button", { name: "Bulk Link (CSV)", exact: true }).click();
        await page.locator("#csv-upload").setInputFiles({
            name: "links.csv",
            mimeType: "text/csv",
            buffer: Buffer.from("CS101,CSN101\n"),
        });
        await page.getByRole("button", { name: "Upload and Link", exact: true }).click();
        await page.getByRole("heading", { name: "Bulk linking", exact: true }).waitFor();
        assert.ok(requests.some((r) => r.path.endsWith("/bulk-link")));
    });
