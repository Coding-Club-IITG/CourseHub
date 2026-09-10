import assert from "node:assert/strict";
import { before, after, test } from "node:test";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import { dualSessionFixture } from "./support/dual-session.js";
let browser;
before(async () => {
    browser = await chromium.launch({
        executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
    });
});
after(async () => browser?.close());

for (const initialRole of ["student", "admin"])
    for (const width of [1440, 390]) {
        test(`${initialRole} can open the other portal, sign in and log out independently at ${width}px`, async (t) => {
            const f = await dualSessionFixture(browser, t, { initialRole, width });
            const pages = { student: await f.context.newPage(), admin: await f.context.newPage() };
            const destinations = {
                student: "/profile?tab=courses#history",
                admin: "/admin/courses?sort=name#list",
            };
            const origins = { student: f.frontend, admin: f.admin };
            const otherRole = initialRole === "student" ? "admin" : "student";
            const ready = (role) =>
                pages[role]
                    .getByRole("heading", {
                        name: role === "student" ? "Dual Session Student" : "Courses",
                        exact: true,
                    })
                    .waitFor();
            await pages[initialRole].goto(origins[initialRole] + destinations[initialRole]);
            await ready(initialRole);
            const other = pages[otherRole];
            await other.goto(origins[otherRole] + destinations[otherRole]);
            const signIn = other.getByRole("button", {
                name: otherRole === "admin" ? "Sign In" : "Sign in with Microsoft",
                exact: true,
            });
            await signIn.waitFor();
            assert.equal(
                new URL(other.url()).searchParams.get("returnTo"),
                destinations[otherRole],
            );
            assert.equal(
                await other
                    .getByText("We couldn’t check your session. Please try again.", { exact: true })
                    .count(),
                0,
            );
            if (otherRole === "admin") {
                await other
                    .getByRole("textbox", { name: "User ID", exact: true })
                    .fill("dual-session-admin");
                await other.getByLabel(/^Password/).fill("fixture-password");
            }
            await signIn.click();
            await ready(otherRole);
            assert.equal(
                new URL(other.url()).pathname +
                    new URL(other.url()).search +
                    new URL(other.url()).hash,
                destinations[otherRole],
            );
            assert.deepEqual((await f.context.cookies(f.api)).map((c) => c.name).sort(), [
                "adminToken",
                "token",
            ]);
            await pages[initialRole].reload();
            await ready(initialRole);
            for (const role of ["student", "admin"]) {
                assert.ok(
                    f.requests.some(
                        (r) =>
                            r.path === (role === "student" ? "/api/user" : "/api/admin/") &&
                            r.role === role &&
                            r.cookies.includes("token") &&
                            r.cookies.includes("adminToken"),
                    ),
                );
                if (process.env.BROWSER_ARTIFACT_DIR) {
                    fs.mkdirSync(process.env.BROWSER_ARTIFACT_DIR, { recursive: true });
                    await pages[role].screenshot({
                        path: path.join(
                            process.env.BROWSER_ARTIFACT_DIR,
                            `${initialRole}-first-both-active-${role}-${width}.png`,
                        ),
                        fullPage: true,
                    });
                }
            }
            if (width === 390)
                await other
                    .getByRole("button", {
                        name: otherRole === "admin" ? "Open navigation" : "Toggle mobile menu",
                        exact: true,
                    })
                    .click();
            await other
                .getByRole("button", {
                    name: otherRole === "admin" ? "Logout" : "Log Out",
                    exact: true,
                })
                .click();
            await signIn.waitFor();
            assert.deepEqual(
                (await f.context.cookies(f.api)).map((c) => c.name),
                [initialRole === "student" ? "token" : "adminToken"],
            );
            await pages[initialRole].reload();
            await ready(initialRole);
            await other.goto(origins[otherRole] + destinations[otherRole]);
            await signIn.waitFor();
            assert.equal(
                new URL(other.url()).searchParams.get("returnTo"),
                destinations[otherRole],
            );
        });
    }
