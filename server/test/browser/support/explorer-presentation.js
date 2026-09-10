import { fileAccessFixture } from "./file-access.js";
import { course, folder, year, student } from "../../fixtures/library.js";

export async function navigationFixture(
    browser,
    t,
    { width = 1440, touch = false, folderCount = 18 } = {},
) {
    const fixture = await fileAccessFixture(browser, t, { width, touch, role: "br" });
    const previousCourses = [2, 1].map((semester) => ({
        semester,
        year: 2025,
        courses: Array.from({ length: 6 }, (_, index) => ({
            code: `HS${semester}${String(index + 1).padStart(2, "0")}`,
            name: `Previous course ${index + 1}`,
        })),
    }));
    await fixture.context.route("**/api/user", (route) =>
        route.fulfill({
            json: {
                ...student,
                name: "Test Student",
                isBR: true,
                csrfToken: "c".repeat(43),
                previousCourses,
                capabilities: {
                    ...student.capabilities,
                    canManageCourses: [
                        "CS101",
                        ...previousCourses.flatMap((semester) =>
                            semester.courses.map((c) => c.code),
                        ),
                    ],
                },
            },
        }),
    );
    await fixture.context.route("**/api/course/*", (route) => {
        const code = new URL(route.request().url()).pathname.split("/").pop();
        return route.fulfill({
            json: {
                ...course,
                code,
                revision: "navigation-review",
                children: [
                    {
                        ...year,
                        name: "2026",
                        capabilities: { canManage: true },
                        children: Array.from({ length: folderCount }, (_, index) => ({
                            ...folder,
                            _id: index === 0 ? folder._id : `507f1f77bcf86cd79943${index + 1000}`,
                            courses: [code],
                            name: index === 0 ? "Lecture Notes" : `Topic ${index + 1}`,
                            capabilities: { canManage: true, canContribute: true },
                        })),
                    },
                    {
                        ...year,
                        _id: "507f1f77bcf86cd799439042",
                        name: "2025",
                        children: [],
                        totalFileCount: 0,
                        capabilities: { canManage: true },
                    },
                ],
            },
        });
    });
    return fixture;
}
