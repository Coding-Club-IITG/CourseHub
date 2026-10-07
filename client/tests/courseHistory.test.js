import assert from "node:assert/strict";
import { after, test } from "node:test";
import { createServer } from "vite";
import react from "@vitejs/plugin-react";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Provider } from "react-redux";
import { createStore } from "redux";
import { StaticRouter } from "react-router-dom/server.js";
import { fileURLToPath } from "node:url";

const vite = await createServer({
    root: fileURLToPath(new URL("../", import.meta.url)),
    configFile: false,
    plugins: [react()],
    server: { middlewareMode: true, hmr: false },
    ssr: { noExternal: ["axios"] },
});
after(() => vite.close());

const { fetchUserCoursesData } = await vite.ssrLoadModule("/src/api/Course.js");
const { default: axios } = await vite.ssrLoadModule("axios");
const current = [{ code: "CS201", name: "Current course" }];
const previous = [{ semester: 1, year: 2025, courses: [{ code: "CS101", name: "Previous course" }] }];
const user = { rollNumber: 250101001, isBR: false, courses: current, previousCourses: previous };

test("normal users and BRs both load current courses and history", async (t) => {
    const post = t.mock.method(axios, "post", async (url) => ({
        data: { courses: url.endsWith("/fetchPreviousCourses") ? previous : current },
    }));
    for (const isBR of [false, true]) {
        assert.deepEqual(await fetchUserCoursesData({ ...user, isBR }), { courses: current, previousCourses: previous });
    }
    assert.equal(post.mock.callCount(), 4);
});

test("failed history fetch preserves successfully loaded current courses and saved history", async (t) => {
    const updated = [{ code: "CS301" }];
    t.mock.method(axios, "post", async (url) => {
        if (url.endsWith("/fetchPreviousCourses")) throw new Error("History unavailable");
        return { data: { courses: updated } };
    });
    assert.deepEqual(await fetchUserCoursesData(user), { courses: updated, previousCourses: previous });
});

test("failed current-course fetch preserves successfully loaded history and saved current courses", async (t) => {
    const updated = [{ semester: 3, year: 2026, courses: [{ code: "CS202" }] }];
    t.mock.method(axios, "post", async (url) => {
        if (url.endsWith("/fetchCourses")) throw new Error("Current courses unavailable");
        return { data: { courses: updated } };
    });
    assert.deepEqual(await fetchUserCoursesData(user), { courses: current, previousCourses: updated });
});

test("new users retain successful results when one request fails", async (t) => {
    t.mock.method(axios, "post", async (url) => {
        if (url.endsWith("/fetchPreviousCourses")) throw new Error("History unavailable");
        return { data: { courses: current } };
    });
    assert.deepEqual(await fetchUserCoursesData({ rollNumber: user.rollNumber, isBR: false }), {
        courses: current, previousCourses: [],
    });
});

test("failure of both course requests still reaches the loading page's fallback", async (t) => {
    t.mock.method(axios, "post", async () => { throw new Error("Portal unavailable"); });
    await assert.rejects(fetchUserCoursesData(user), /Portal unavailable/);
});

function render(Component, isBR, props = {}) {
    const state = {
        user: { loggedIn: true, user: { ...user, name: "Test Student", degree: "B.Tech", department: "Computing", isBR, readOnly: [] }, localCourses: [], favourites: [] },
        fileBrowser: { currentCourseCode: "CS101", currentCourse: [], currentYear: null, currentYearFolderStructure: [], folderHistory: [], allCourseData: [], currentFolder: { _id: "folder1", children: [] } },
    };
    const store = createStore(() => state);
    return renderToStaticMarkup(React.createElement(Provider, { store },
        React.createElement(StaticRouter, { location: "/browse/CS101" }, React.createElement(Component, props))));
}

test("normal users see verified historical files without BR controls; BR controls remain available", async () => {
    const { default: FileController } = await vite.ssrLoadModule("/src/screens/browse/components/collapsible/components/file-controller/index.jsx");
    const files = [
        { _id: "verified", name: "Approved.pdf", size: "1024", isVerified: true },
        { _id: "pending", name: "Pending.pdf", size: "1024", isVerified: false },
    ];
    const normal = render(FileController, false, { files, code: "CS101" });
    assert.match(normal, /Approved/);
    assert.doesNotMatch(normal, /Pending|title="Verify"|title="Delete"|title="Rename"/);
    const br = render(FileController, true, { files, code: "CS101" });
    assert.match(br, /Approved/);
    assert.match(br, /Pending/);
    assert.match(br, /title="Verify"/);
    assert.match(br, /title="Delete"/);
    assert.match(br, /title="Rename"/);
});

test("historical year and folder management remain BR-only", async () => {
    const { default: YearInfo } = await vite.ssrLoadModule("/src/screens/browse/components/year-info/index.jsx");
    const props = { courseCode: "CS101", course: [{ _id: "year1", name: "2025", children: [] }], currYear: 0 };
    const normal = render(YearInfo, false, { ...props, isBR: false });
    assert.match(normal, /2025/);
    assert.doesNotMatch(normal, /New Year|Delete Year/);
    const br = render(YearInfo, true, { ...props, isBR: true });
    assert.match(br, /New Year/);
    assert.match(br, /Delete Year/);

    const { default: FolderInfo } = await vite.ssrLoadModule("/src/screens/browse/components/folder-info/index.jsx");
    const folderProps = { courseCode: "CS101", folderId: "folder1", name: "Notes", path: "Notes", canDownload: false };
    assert.doesNotMatch(render(FolderInfo, false, { ...folderProps, isBR: false }), /Add Folder/);
    assert.match(render(FolderInfo, true, { ...folderProps, isBR: true }), /Add Folder/);
});

test("normal users see the history section on the dashboard", async (t) => {
    const originalWindow = globalThis.window;
    globalThis.window = { innerWidth: 1024 };
    t.after(() => { globalThis.window = originalWindow; });
    const { default: Dashboard } = await vite.ssrLoadModule("/src/screens/dashboard/index.jsx");
    assert.match(render(Dashboard, false), /SHOW PREVIOUS COURSES/);
    assert.match(render(Dashboard, true), /SHOW PREVIOUS COURSES/);
});

test("desktop and mobile course browsing include normal users' historical courses", async (t) => {
    const originalWindow = globalThis.window;
    globalThis.window = { innerWidth: 1024 };
    t.after(() => { globalThis.window = originalWindow; });
    const { default: BrowseScreen } = await vite.ssrLoadModule("/src/screens/browse/index.jsx");
    const desktop = render(BrowseScreen, false);
    assert.match(desktop, /PREVIOUS COURSES/);
    assert.match(desktop, /Semester 1 \(2025\)/);
    assert.match(desktop, /Previous Course/);
    globalThis.window.innerWidth = 375;
    assert.match(render(BrowseScreen, false), /CS101: Previous course/);
});
