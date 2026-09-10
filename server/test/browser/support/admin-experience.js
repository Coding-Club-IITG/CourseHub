import { student, administrator, course, libraryFile } from "../../fixtures/library.js";
import { deletionOperation } from "../../fixtures/operations.js";
export async function adminExperienceFixture(
    browser,
    { width = 1440, scenario = "students", mode = "ready" } = {},
) {
    const origin = process.env.BROWSER_ADMIN_ORIGIN || "http://127.0.0.1:48232";
    const context = await browser.newContext({
        viewport: { width, height: 900 },
        locale: "en-US",
        timezoneId: "Asia/Kolkata",
    });
    const page = await context.newPage();
    page.setDefaultTimeout(7000);
    await page.clock.setFixedTime(new Date("2026-09-09T06:30:00Z"));
    const users = Array.from({ length: 3 }, (_, i) => ({
        ...student,
        _id: "507f1f77bcf86cd79943901" + i,
        name: i ? "Student with a long descriptive name " + i : student.name,
        email: `student-${i}@example.test`,
        rollNumber: 240101001 + i,
        isBR: i === 1,
        isRegistered: true,
        courseCount: 1,
    }));
    const courses = [
        course,
        {
            ...course,
            _id: "507f1f77bcf86cd799439052",
            code: "MA101",
            name: "Mathematics, Analysis and Long Course Titles with Worked Examples",
        },
    ];
    const managed = (node) => ({
        ...node,
        capabilities: { canManage: true, canModerate: true, canContribute: true },
        ...(node.children ? { children: node.children.map(managed) } : {}),
    });
    const requests = [],
        errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await context.route("**/api/**", async (route) => {
        const request = route.request(),
            url = new URL(request.url()),
            p = url.pathname;
        requests.push({ path: p, method: request.method() });
        let status = 200,
            data = {};
        if (p === "/api/admin/") {
            status = scenario === "login" ? 401 : 200;
            data = { user: administrator, csrfToken: "c".repeat(43) };
        } else if (p === "/api/auth/csrf") data = { csrfToken: "c".repeat(43) };
        else if (mode === "error" && !p.startsWith("/api/operations")) {
            status = 503;
            data = {
                message: "Synthetic service unavailable. Please retry.",
                requestId: "admin-capture-request",
            };
        } else if (mode === "loading" && !p.startsWith("/api/operations")) {
            await new Promise((resolve) => setTimeout(resolve, 3000));
            data = { items: users, page: 1, pageSize: 20, total: users.length };
        } else if (p === "/api/admin/dbcourses")
            data = { items: courses, page: 1, pageSize: 20, total: courses.length };
        else if (p === "/api/student/all" || p === "/api/student/search") {
            const q = (url.searchParams.get("q") || "").toLowerCase(),
                page = Number(url.searchParams.get("page") || 1),
                pageSize = Number(url.searchParams.get("pageSize") || 20);
            const matching = users.filter(
                (item) =>
                    (url.searchParams.get("isBR") !== "true" || item.isBR) &&
                    [item.name, item.email, String(item.rollNumber)].some((value) =>
                        value.toLowerCase().includes(q),
                    ),
            );
            data = {
                items: matching.slice((page - 1) * pageSize, page * pageSize),
                page,
                pageSize,
                total: matching.length,
            };
        } else if (p.startsWith("/api/student/"))
            data = { item: users.find((item) => p.endsWith(item._id)) };
        else if (p === "/api/br/allBRs")
            data = { items: users.filter((s) => s.isBR), page: 1, pageSize: 20, total: 1 };
        else if (p.endsWith("/dashboard"))
            data = {
                course: managed(course),
                studentCount: 3,
                contributions: [
                    {
                        contributionId: "synthetic-contribution",
                        courseCode: "CS101",
                        approved: false,
                        files: [
                            {
                                ...libraryFile,
                                isVerified: false,
                                affectedCourses: ["CS101", "MA101"],
                            },
                        ],
                        affectedCourses: ["CS101", "MA101"],
                    },
                ],
            };
        else if (p === "/api/operations")
            data = {
                items: scenario === "operations" ? [deletionOperation()] : [],
                page: 1,
                pageSize: 20,
                total: scenario === "operations" ? 1 : 0,
            };
        else if (p.startsWith("/api/operations/")) data = deletionOperation();
        else {
            status = 404;
            data = { message: "Unknown synthetic request" };
        }
        await route.fulfill({ status, json: data }).catch(() => {});
    });
    return { page, context, origin, users, courses, requests, errors };
}
