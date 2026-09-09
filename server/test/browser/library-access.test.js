import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { before, after, test } from "node:test";
import { createRequire } from "node:module";
import { student, course, folder, libraryFile } from "../fixtures/library.js";

// Use the installed browser-test toolchain; no browser or provider is downloaded at runtime.
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || "playwright");
const frontend = process.env.BROWSER_CLIENT_ORIGIN || "http://127.0.0.1:4183";
const api = process.env.BROWSER_API_ORIGIN || "http://127.0.0.1:4185";
const cookieValue = "synthetic-browser-session";
let browser;
before(async () => {
    assert.notEqual(frontend, api, "Use distinct frontend/API origins to test credentials");
    browser = await chromium.launch({
        headless: true,
        executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
    });
});
after(async () => browser?.close());

async function openPage(
    t,
    {
        width = 1440,
        signedIn = true,
        sessionStatus,
        holdSession,
        actor = student,
        folderData = folder,
        moderationQueue = [],
    } = {},
) {
    const context = await browser.newContext({
        viewport: { width, height: 900 },
        locale: "en-US",
        timezoneId: "Asia/Kolkata",
        serviceWorkers: "block",
    });
    if (signedIn)
        await context.addCookies([
            { name: "token", value: cookieValue, url: api, httpOnly: true, sameSite: "Lax" },
        ]);
    const page = await context.newPage();
    const errors = [];
    const requests = [];
    let operation;
    page.on("pageerror", (error) => errors.push(error.message));
    t.after(async () => {
        if (process.env.BROWSER_ARTIFACT_DIR) {
            fs.mkdirSync(process.env.BROWSER_ARTIFACT_DIR, { recursive: true });
            const name = t.name.replace(/[^a-z0-9-]+/gi, "-");
            await page.screenshot({
                path: path.join(process.env.BROWSER_ARTIFACT_DIR, name + ".png"),
                fullPage: true,
            });
            fs.writeFileSync(
                path.join(process.env.BROWSER_ARTIFACT_DIR, name + ".json"),
                JSON.stringify(
                    { requests, errors, text: await page.locator("body").innerText() },
                    null,
                    2,
                ),
            );
        }
        await context.close();
        assert.deepEqual(errors, []);
    });
    await context.route("**/*", async (route) => {
        const request = route.request();
        const url = new URL(request.url());
        if (url.origin === frontend && !url.pathname.startsWith("/api/")) return route.continue();
        if (url.href === libraryFile.thumbnail.url)
            return route.fulfill({
                contentType: "image/gif",
                body: Buffer.from(
                    "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
                    "base64",
                ),
            });
        if (url.href === "https://download.example.test/notes") {
            assert.equal((await request.allHeaders()).cookie, undefined);
            return route.fulfill({
                contentType: "application/pdf",
                body: "%PDF-1.4\nSynthetic notes\n%%EOF",
            });
        }
        if (url.origin !== api) return route.abort();
        const headers = await request.allHeaders();
        const hasSession = headers.cookie?.includes(`token=${cookieValue}`);
        requests.push({
            path: url.pathname,
            method: request.method(),
            hasSession: Boolean(hasSession),
            headers,
            body: request.postData(),
        });
        let status = 200;
        let data;
        if (url.pathname === "/api/user") {
            if (holdSession) await holdSession;
            status = sessionStatus ? sessionStatus() : hasSession ? 200 : 401;
            data =
                status === 200
                    ? { ...actor, csrfToken: "c".repeat(43) }
                    : { message: "Unable to restore session" };
        } else if (!hasSession) {
            status = 401;
            data = { message: "Sign in to continue" };
        } else if (url.pathname === "/api/auth/csrf") data = { csrfToken: "c".repeat(43) };
        else if (url.pathname === "/api/course/CS101")
            data = {
                found: true,
                ...course,
                children: [
                    {
                        ...course.children[0],
                        children: [folderData],
                        totalFileCount: folderData.children.length,
                    },
                ],
            };
        else if (url.pathname.startsWith("/api/folder/content/")) data = folderData;
        else if (url.pathname === `/api/files/thumbnail/${libraryFile._id}`) {
            assert.ok(hasSession);
            return route.fulfill({
                contentType: "image/gif",
                body: Buffer.from(
                    "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
                    "base64",
                ),
            });
        } else if (url.pathname === "/api/contribution/br")
            data = { unverifiedContributions: moderationQueue };
        else if (url.pathname.startsWith("/api/files/verify/"))
            data = { file: { ...libraryFile, isVerified: true } };
        else if (url.pathname === "/api/contribution/limits")
            data = { fileBytes: 104857600, batchBytes: 1073741824, files: 40, concurrentFiles: 2 };
        else if (url.pathname === "/api/operations")
            data = { items: [], page: 1, pageSize: 20, total: 0 };
        else if (url.pathname.startsWith("/api/operations/")) data = operation;
        else if (url.pathname === "/api/contribution/") {
            if (request.method() === "POST") {
                status = 201;
                operation = {
                    id: "server-issued-contribution",
                    kind: "upload",
                    name: "File upload",
                    status: "awaiting",
                    canCancel: true,
                    entries: JSON.parse(request.postData()).manifest.map((file, index) => ({
                        ...file,
                        id: "entry-" + index,
                        state: "pending",
                        uploadedBytes: 0,
                    })),
                };
                data = operation;
            } else data = [];
        } else if (url.pathname === "/api/contribution/upload") {
            status = 202;
            operation.status = "completed";
            operation.canCancel = false;
            operation.entries.forEach((entry) => {
                entry.state = "completed";
                entry.uploadedBytes = entry.size;
            });
            data = { operationId: operation.id };
        } else if (url.pathname === "/api/files/download")
            data = { downloadLink: `/api/files/content/${libraryFile._id}?download=1` };
        else if (url.pathname === `/api/files/content/${libraryFile._id}`) {
            assert.ok(hasSession);
            return route.fulfill({
                contentType: "application/pdf",
                body: "%PDF-1.4\nNotes\n%%EOF",
                headers: {
                    "access-control-allow-origin": frontend,
                    "access-control-allow-credentials": "true",
                },
            });
        } else if (url.pathname === "/api/event/examdates")
            data = { dates: { midSem: "2026-09-15", endSem: "2026-11-25" } };
        else if (url.pathname === "/api/search") data = { found: true, results: [course] };
        else if (url.pathname === "/api/user/favourites") data = [];
        else {
            status = 404;
            data = { message: "Unexpected fixture endpoint" };
        }
        return route
            .fulfill({
                status,
                headers: {
                    "access-control-allow-origin": frontend,
                    "access-control-allow-credentials": "true",
                },
                contentType: typeof data === "string" ? "text/plain" : "application/json",
                body: typeof data === "string" ? data : JSON.stringify(data),
            })
            .catch(() => {});
    });
    return { page, requests };
}

for (const width of [1440, 390]) {
    test(`signed-out and expired sessions return to sign-in without fetching content at ${width}px`, async (t) => {
        for (const signedIn of [false, true]) {
            const { page, requests } = await openPage(t, {
                width,
                signedIn,
                sessionStatus: () => 401,
            });
            await page.goto(`${frontend}/browse/CS101/${folder._id}`);
            await page.waitForURL(
                (url) =>
                    url.pathname === "/" &&
                    url.searchParams.get("returnTo") === `/browse/CS101/${folder._id}`,
            );
            await page.getByText("Sign in with Microsoft", { exact: false }).waitFor();
            assert.ok(requests.length > 0);
            assert.ok(requests.every((request) => request.path === "/api/user"));
        }
    });
    test(`a student session restores the requested folder at ${width}px`, async (t) => {
        const { page, requests } = await openPage(t, { width });
        await page.goto(`${frontend}/browse/CS101/${folder._id}`);
        await page.getByTitle("Lecture notes.pdf", { exact: true }).first().waitFor();
        assert.equal(new URL(page.url()).pathname, `/browse/CS101/${folder._id}`);
        assert.equal(requests[0].path, "/api/user");
        assert.ok(requests.every((request) => request.hasSession));
    });
}

test("library content waits for session confirmation", async (t) => {
    let release;
    const holdSession = new Promise((resolve) => {
        release = resolve;
    });
    const { page, requests } = await openPage(t, { holdSession });
    await page.goto(`${frontend}/browse/CS101`, { waitUntil: "domcontentloaded" });
    await page.getByText("Checking your session...").waitFor();
    assert.ok(requests.every((request) => request.path === "/api/user"));
    assert.equal(await page.locator(".browse-folder").count(), 0);
    release();
    await page.getByText("Lecture Notes", { exact: true }).first().waitFor();
});

test("a failed session check can be retried without losing the requested folder", async (t) => {
    let attempts = 0;
    const { page } = await openPage(t, { sessionStatus: () => (++attempts === 1 ? 503 : 200) });
    await page.goto(`${frontend}/browse/CS101/${folder._id}`);
    await page
        .getByRole("alert")
        .getByText("We couldn’t check your session.", { exact: false })
        .waitFor();
    const retry = page.getByRole("button", { name: "Try again" });
    await page.keyboard.press("Tab");
    assert.equal(await retry.evaluate((button) => button === document.activeElement), true);
    await page.keyboard.press("Enter");
    await page.getByTitle("Lecture notes.pdf", { exact: true }).first().waitFor();
    assert.equal(new URL(page.url()).pathname, `/browse/CS101/${folder._id}`);
});

test("FilePond sends credentials and the contribution association across origins", async (t) => {
    const { page, requests } = await openPage(t);
    await page.goto(`${frontend}/browse/CS101/${folder._id}`);
    await page.getByRole("button", { name: "Contribute", exact: true }).click();
    await page.locator(".filepond--browser").setInputFiles({
        name: "synthetic-notes.pdf",
        mimeType: "application/pdf",
        buffer: Buffer.from("%PDF-1.4\nTest notes\n%%EOF"),
    });
    await page.getByRole("button", { name: "Upload files", exact: true }).click();
    await page.getByText("1 of 1 files uploaded", { exact: true }).waitFor();
    const created = requests.find(
        (request) => request.path === "/api/contribution/" && request.method === "POST",
    );
    const uploaded = requests.find((request) => request.path === "/api/contribution/upload");
    assert.ok(created?.hasSession && uploaded?.hasSession);
    const manifest = JSON.parse(created.body);
    assert.equal(uploaded.headers["contribution-id"], "server-issued-contribution");
    assert.match(created.headers["idempotency-key"], /^[a-f0-9-]{36}$/);
    assert.equal(uploaded.headers["upload-file-id"], "entry-0");
    assert.deepEqual(manifest.manifest, [
        { name: "synthetic-notes.pdf", size: Buffer.byteLength("%PDF-1.4\nTest notes\n%%EOF") },
    ]);
    assert.equal(manifest.contributionId, undefined);
    assert.equal(manifest.uploadedBy, undefined);
    assert.equal(manifest.approved, undefined);
    assert.equal(uploaded.headers.username, undefined);
    assert.equal(uploaded.headers["x-csrf-token"], "c".repeat(43));
    assert.equal(created.headers["x-csrf-token"], "c".repeat(43));
    assert.ok(uploaded.headers["content-type"].startsWith("multipart/form-data"));
    assert.ok(uploaded.body.includes("Test notes"));
});

test("individual and ZIP download requests use authorized resource IDs and credentials", async (t) => {
    const { page, requests } = await openPage(t);
    await page.goto(`${frontend}/browse/CS101/${folder._id}`);
    await page.getByTitle("Lecture notes.pdf", { exact: true }).first().waitFor();
    const link = await page.evaluate(async () => {
        const { getFileDownloadLink } = await import("/src/api/File.js");
        return getFileDownloadLink("507f1f77bcf86cd799439021", "CS101");
    });
    assert.equal(link, `${api}/api/files/content/${libraryFile._id}?download=1`);
    const saved = page.waitForEvent("download");
    await page.getByTitle("Download entire folder as ZIP", { exact: true }).click();
    assert.match((await saved).suggestedFilename(), /\.zip$/);
    const downloads = requests.filter((request) => request.path === "/api/files/download");
    assert.ok(downloads.length >= 2);
    assert.ok(downloads.every((request) => request.hasSession));
});

for (const width of [1440, 390]) {
    test(`a signed-in direct profile link retains its destination at ${width}px`, async (t) => {
        const { page } = await openPage(t, { width });
        await page.goto(`${frontend}/profile`);
        await page.getByText(student.name, { exact: true }).first().waitFor();
        assert.equal(new URL(page.url()).pathname, "/profile");
    });
}

for (const width of [1440, 390]) {
    test(`owners can see their pending files with an approval label at ${width}px`, async (t) => {
        const pending = {
            ...libraryFile,
            _id: "507f1f77bcf86cd799439022",
            name: "Awaiting review.pdf",
            isVerified: false,
            capabilities: { canManage: false },
        };
        const { page } = await openPage(t, {
            width,
            folderData: { ...folder, children: [libraryFile, pending], totalFileCount: 2 },
        });
        await page.goto(frontend + `/browse/CS101/${folder._id}`);
        await page.getByTitle("Awaiting review.pdf", { exact: true }).first().waitFor();
        await page.getByText("Pending approval", { exact: true }).waitFor();
        assert.equal(await page.locator(".file-display .unverify").count(), 0);
    });
}
test("resource capabilities hide management controls despite a stale BR flag and editable course list", async (t) => {
    const actor = {
        ...student,
        isBR: true,
        capabilities: { canManageCourses: [], canContributeCourses: [] },
    };
    const { page } = await openPage(t, {
        actor,
        folderData: { ...folder, capabilities: { canManage: false, canContribute: false } },
    });
    await page.goto(frontend + `/browse/CS101/${folder._id}`);
    await page.getByTitle(libraryFile.name, { exact: true }).first().waitFor();
    assert.equal(
        await page
            .locator(".file-display .unverify, .file-display .verify, .file-display .rename-tick")
            .count(),
        0,
    );
    assert.equal(await page.getByRole("button", { name: /Contribute|Add File/ }).count(), 0);
});
test("shared file deletion identifies every affected course before confirmation", async (t) => {
    const file = {
        ...libraryFile,
        capabilities: { canManage: true },
        affectedCourses: ["CS101", "MA101"],
    };
    const { page, requests } = await openPage(t, {
        actor: { ...student, isBR: true },
        folderData: {
            ...folder,
            children: [file],
            capabilities: { canManage: true, canContribute: true },
        },
    });
    await page.goto(frontend + `/browse/CS101/${folder._id}`);
    await page.getByTitle("Delete", { exact: true }).click();
    await page
        .getByText("Deleting it removes it from every listed course.", { exact: false })
        .waitFor();
    assert.ok((await page.locator("body").innerText()).includes("CS101, MA101"));
    await page.getByRole("button", { name: "Cancel", exact: true }).click();
    assert.ok(requests.every((request) => request.method !== "DELETE"));
});
test("restoring a session discards stored file trees from an earlier actor", async (t) => {
    const { page, requests } = await openPage(t);
    await page.addInitScript(
        (tree) => sessionStorage.setItem("AllCourses", JSON.stringify([tree])),
        {
            ...course,
            children: [
                {
                    ...course.children[0],
                    children: [
                        {
                            ...folder,
                            children: [
                                {
                                    ...libraryFile,
                                    name: "Private cached file.pdf",
                                    isVerified: false,
                                },
                            ],
                        },
                    ],
                },
            ],
        },
    );
    await page.goto(frontend + `/browse/CS101/${folder._id}`);
    await page.getByTitle(libraryFile.name, { exact: true }).first().waitFor();
    assert.equal(await page.getByTitle("Private cached file.pdf", { exact: true }).count(), 0);
    assert.ok(requests.some((request) => request.path === "/api/course/CS101"));
});

test("moderation uses the authorized shared-course context returned by the server", async (t) => {
    const pending = {
        ...libraryFile,
        isVerified: false,
        capabilities: { canManage: true },
        affectedCourses: ["CS101", "MA101"],
    };
    const { page, requests } = await openPage(t, {
        actor: {
            ...student,
            isBR: true,
            capabilities: { canManageCourses: ["CS101"], canContributeCourses: ["CS101"] },
        },
        moderationQueue: [
            {
                contributionId: "shared-review",
                courseCode: "MA101",
                managementCourseCode: "CS101",
                parentFolder: folder._id,
                updatedAt: "2026-09-08T06:30:00Z",
                files: [pending],
            },
        ],
    });
    await page.goto(frontend + "/profile");
    await page.getByText("APPROVE", { exact: true }).click();
    await page.getByRole("button", { name: "Verify", exact: true }).click();
    await page.getByText("NO PENDING CONTRIBUTIONS", { exact: true }).waitFor();
    const action = requests.find((request) => request.path.startsWith("/api/files/verify/"));
    assert.equal(action.method, "PUT");
    assert.equal(JSON.parse(action.body).courseCode, "CS101");
    assert.ok(action.hasSession);
});

test("thumbnail backgrounds send the session cookie to the resource-ID endpoint", async (t) => {
    const thumbnailPath = `/api/files/thumbnail/${libraryFile._id}`;
    const { page, requests } = await openPage(t, {
        folderData: {
            ...folder,
            children: [{ ...libraryFile, thumbnail: { url: thumbnailPath } }],
        },
    });
    const loaded = page.waitForResponse(
        (response) => new URL(response.url()).pathname === thumbnailPath,
    );
    await page.goto(frontend + `/browse/CS101/${folder._id}`);
    assert.equal((await loaded).status(), 200);
    assert.ok(requests.find((request) => request.path === thumbnailPath)?.hasSession);
});
