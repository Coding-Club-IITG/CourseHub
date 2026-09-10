import { unavailableExamResponse } from "../../fixtures/exams.js";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { student, course, year, folder, libraryFile } from "../../fixtures/library.js";

export const fileIds = {
    file: libraryFile._id,
    folder: folder._id,
    second: "507f1f77bcf86cd799439088",
};
export async function fileAccessFixture(browser, t, { width = 1440, role = "student", touch = false } = {}) {
    const frontend = process.env.BROWSER_CLIENT_ORIGIN || "http://127.0.0.1:4187";
    const api = process.env.BROWSER_API_ORIGIN || "http://127.0.0.1:4185";
    const context = await browser.newContext({
        viewport: { width, height: 900 },
        hasTouch: touch,
        locale: "en-US",
        timezoneId: "Asia/Kolkata",
    });
    await context.addCookies([{ name: "token", value: "synthetic", url: api }]);
    const state = {
        signedIn: true,
        favourite: false,
        unavailable: false,
        name: "Lecture notes.pdf",
        folderName: "Lecture Notes",
        saveStatus: 200,
        fileStatus: 200,
        contentStatus: 200,
        pending: false,
    };
    const requests = [],
        errors = [];
    const visible = () =>
        !state.unavailable && (!state.pending || role === "owner" || role === "br");
    const file = () => ({
        ...libraryFile,
        name: state.name,
        isVerified: !state.pending,
        contributorName: "Test Contributor",
        thumbnail: { url: `/api/files/thumbnail/${libraryFile._id}` },
        capabilities: { canManage: role === "br" },
        affectedCourses: ["CS101", "MA101"],
    });
    const favourites = () =>
        !state.favourite
            ? []
            : [
                  visible()
                      ? {
                            _id: "507f1f77bcf86cd799439077",
                            id: libraryFile._id,
                            name: state.name,
                            code: "CS101",
                            path: `2026 / ${state.folderName}`,
                            folderId: folder._id,
                            available: true,
                            file: file(),
                        }
                      : { _id: "507f1f77bcf86cd799439077", id: libraryFile._id, available: false },
              ];
    await context.route("**/api/**", async (route) => {
        const request = route.request(),
            url = new URL(request.url());
        requests.push({
            path: url.pathname,
            method: request.method(),
            body: request.postData(),
            url: url.href,
            headers: await request.allHeaders(),
        });
        let status = state.signedIn ? 200 : 401,
            data = {};
        if (!state.signedIn) data = { message: "Sign in to continue" };
        else if (url.pathname === "/api/user")
            data = {
                ...student,
                name: "Test Student",
                csrfToken: "c".repeat(43),
                isBR: role === "br",
                capabilities: { ...student.capabilities, canManageCourses: role === "br" ? ["CS101"] : [] },
                favourites: favourites(),
            };
        else if (url.pathname === "/api/auth/csrf") data = { csrfToken: "c".repeat(43) };
        else if (url.pathname.startsWith("/api/course/"))
            data = {
                ...course,
                revision: JSON.stringify(state),
                children: [
                    {
                        ...year,
                        capabilities: { canManage: role === "br", canContribute: false },
                        name: "2026",
                        children: [
                            {
                                ...folder,
                                name: state.folderName,
                                capabilities: { canManage: role === "br", canContribute: true },
                                children: visible()
                                    ? [
                                          file(),
                                          {
                                              ...file(),
                                              _id: fileIds.second,
                                              name: "Tutorial exercises with a long descriptive title.pdf",
                                              thumbnail: {},
                                          },
                                      ]
                                    : [],
                            },
                        ],
                    },
                ],
            };
        else if (url.pathname.startsWith("/api/files/link/")) {
            status = visible() ? state.fileStatus : 404;
            data = status === 200 ? { file: file() } : { message: "This file is unavailable." };
        } else if (url.pathname.startsWith("/api/files/thumbnail/")) {
            status = 404;
            data = { message: "Thumbnail unavailable" };
        } else if (url.pathname === "/api/files/download") {
            status = visible() ? state.fileStatus : 404;
            data =
                status === 200
                    ? { downloadLink: `/api/files/content/${libraryFile._id}?download=1` }
                    : { message: "This file is unavailable." };
        } else if (
            url.pathname.startsWith("/api/files/content/") ||
            url.pathname.startsWith("/api/files/preview/")
        )
            return state.contentStatus !== 200
                ? route.fulfill({
                      status: state.contentStatus,
                      contentType: "application/json",
                      body: JSON.stringify({ message: "File delivery unavailable. Please retry." }),
                  })
                : route.fulfill({ contentType: "application/pdf", body: "%PDF-1.4 fixture file" });
        else if (url.pathname.startsWith("/api/user/favourites")) {
            status = state.saveStatus;
            if (status === 200) state.favourite = request.method() !== "DELETE";
            data =
                status === 200
                    ? { favourites: favourites() }
                    : { message: "Favourites could not be saved. Please retry." };
        } else if (url.pathname === "/api/operations") data = { items: [] };
        else if (url.pathname === "/api/contribution/limits")
            data = { fileBytes: 104857600, batchBytes: 1073741824, files: 40, concurrentFiles: 2 };
        else if (url.pathname === "/api/contribution/") data = [];
        else if (url.pathname === "/api/event/examdates") data = unavailableExamResponse;
        else status = 404;
        await route
            .fulfill({ status, contentType: "application/json", body: JSON.stringify(data) })
            .catch(() => {});
    });
    const page = await context.newPage();
    page.setDefaultTimeout(7000);
    page.on("pageerror", (e) => errors.push(e.message));
    await page.clock.setFixedTime(new Date("2026-09-09T06:30:00Z"));
    t.after(async () => {
        if (process.env.BROWSER_ARTIFACT_DIR && !page.isClosed()) {
            fs.mkdirSync(process.env.BROWSER_ARTIFACT_DIR, { recursive: true });
            await page.screenshot({
                path: path.join(
                    process.env.BROWSER_ARTIFACT_DIR,
                    t.name.replace(/[^a-z0-9-]+/gi, "-") + ".png",
                ),
                fullPage: true,
            });
        }
        await context.close();
        assert.deepEqual(errors, []);
    });
    return { page, context, state, requests, frontend, api, file, favourites };
}
