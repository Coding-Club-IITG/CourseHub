import assert from "node:assert/strict";
import { student } from "../../fixtures/library.js";

export async function dualSessionFixture(
    browser,
    t,
    { initialRole = "student", width = 1440 } = {},
) {
    const frontend = process.env.BROWSER_CLIENT_ORIGIN || "http://localhost:5173";
    const admin = process.env.BROWSER_ADMIN_ORIGIN || "http://localhost:5174";
    const api = process.env.BROWSER_API_ORIGIN || "http://localhost:8080";
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    const cookieName = { student: "token", admin: "adminToken" };
    const csrf = { student: "s".repeat(43), admin: "a".repeat(43) };
    const requests = [],
        errors = [];
    const signIn = (role) =>
        context.addCookies([
            {
                name: cookieName[role],
                value: role + "-session",
                url: api,
                httpOnly: true,
                sameSite: "Lax",
            },
        ]);
    if (initialRole) await signIn(initialRole);
    await context.route("**/api/**", async (route) => {
        const request = route.request(),
            url = new URL(request.url());
        if (!url.pathname.startsWith("/api/")) return route.continue();
        const headers = await request.allHeaders();
        const cookies = Object.fromEntries(
            (headers.cookie || "")
                .split("; ")
                .filter(Boolean)
                .map((value) => value.split("=")),
        );
        const active = (role) => cookies[cookieName[role]] === role + "-session";
        const role = url.pathname.startsWith("/api/admin/")
            ? "admin"
            : url.pathname.startsWith("/api/user") || url.pathname === "/api/auth/logout"
              ? "student"
              : headers["x-session-role"] || "student";
        requests.push({
            path: url.pathname,
            role: headers["x-session-role"],
            cookies: Object.keys(cookies),
        });
        if (url.pathname === "/api/auth/login") {
            await signIn("student");
            return route.fulfill({
                status: 302,
                headers: {
                    location: frontend + (url.searchParams.get("returnTo") || "/dashboard"),
                },
            });
        }
        if (url.pathname === "/api/admin/auth/login") {
            const body = request.postDataJSON();
            assert.deepEqual(body, { userId: "dual-session-admin", password: "fixture-password" });
            await signIn("admin");
            return route.fulfill({ json: { success: true, csrfToken: csrf.admin } });
        }
        if (url.pathname === "/api/auth/csrf") {
            const selected = url.searchParams.get("role");
            return route.fulfill({
                status: active(selected) ? 200 : 403,
                json: { csrfToken: active(selected) ? csrf[selected] : undefined },
            });
        }
        if (!active(role)) {
            // Match the API's role guard: another authenticated role is a 403.
            return route.fulfill({
                status: active(role === "student" ? "admin" : "student") ? 403 : 401,
                json: { message: "You do not have permission for this action" },
            });
        }
        if (["/api/auth/logout", "/api/admin/auth/logout"].includes(url.pathname)) {
            assert.equal(headers["x-csrf-token"], csrf[role]);
            assert.equal(headers["x-session-role"], role);
            await context.clearCookies({ name: cookieName[role] });
            return route.fulfill({ json: { success: true } });
        }
        if (url.pathname === "/api/user") {
            assert.equal(headers["x-session-role"], "student");
            return route.fulfill({
                json: { ...student, name: "Dual Session Student", csrfToken: csrf.student },
            });
        }
        if (url.pathname === "/api/admin/") {
            assert.equal(headers["x-session-role"], "admin");
            return route.fulfill({
                json: {
                    user: {
                        userId: "dual-session-admin",
                        capabilities: { canManageAllCourses: true },
                    },
                    csrfToken: csrf.admin,
                },
            });
        }
        if (url.pathname === "/api/admin/dbcourses")
            return route.fulfill({ json: { items: [], page: 1, pageSize: 20, total: 0 } });
        if (url.pathname === "/api/operations") return route.fulfill({ json: { items: [] } });
        if (url.pathname === "/api/contribution/") return route.fulfill({ json: [] });
        return route.fulfill({ status: 404, json: { message: "Not found" } });
    });
    context.on("page", (page) => {
        page.setDefaultTimeout(10000);
        page.on("pageerror", (error) => errors.push(error.message));
    });
    t.after(async () => {
        await context.close();
        assert.deepEqual(errors, []);
    });
    return { context, frontend, admin, api, requests };
}
