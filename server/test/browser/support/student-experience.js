import { fileAccessFixture } from "./file-access.js";
import { student, libraryFile, folder } from "../../fixtures/library.js";
export async function experienceFixture(browser, t, { width = 390, scenario = "long" } = {}) {
    const fixture = await fileAccessFixture(browser, t, { width });
    const user = { ...student, name: "Test Student", csrfToken: "c".repeat(43) };
    if (scenario === "empty") Object.assign(user, { courses: [], readOnly: [], favourites: [] });
    if (scenario === "other-user")
        Object.assign(user, {
            _id: "507f1f77bcf86cd799439099",
            rollNumber: "260199999",
            name: "Second Test Student",
        });
    if (["long", "history"].includes(scenario)) {
        user.courses = [
            {
                code: "CS101",
                name: "Introduction to Computing, Algorithms and Mathematical Foundations with Worked Examples",
            },
        ];
        user.isBR = true;
        user.capabilities = { canManageCourses: ["CS101"] };
        user.previousCourses = Array.from({ length: 12 }, (_, index) => ({
            semester: index + 1,
            year: 2020 + Math.floor(index / 2),
            courses: Array.from({ length: 15 }, (_, i) => ({
                code: `QA${index + 1}${String(i).padStart(2, "0")}`,
                name: `Historical course ${i + 1} with a long descriptive title`,
            })),
        }));
    }
    if (scenario === "moderation") {
        user.isBR = true;
        user.capabilities = { canManageCourses: ["CS101"] };
    }
    await fixture.page.route("**/api/user", (r) => r.fulfill({ json: user }));
    const submissions = Array.from({ length: scenario === "other-user" ? 4 : 30 }, (_, index) => ({
        _id: `submission-${index}`,
        courseCode: "CS101",
        parentFolder: folder._id,
        updatedAt: "2026-09-09T06:30:00Z",
        files: [
            {
                ...libraryFile,
                _id: "507f1f77bcf86cd79943" + String(index).padStart(4, "0"),
                isVerified: scenario === "moderation" ? false : index % 2 === 0,
                name: `${scenario === "other-user" ? "Second student - " : ""}Lecture ${index + 1} - worked examples and long descriptions.pdf`,
                contributorName: scenario === "moderation" ? "Second Test Student" : user.name,
                capabilities: { canManage: scenario === "moderation" },
            },
        ],
    }));
    await fixture.page.route("**/api/contribution/br", (r) =>
        r.fulfill({
            json: { unverifiedContributions: scenario === "moderation" ? submissions : [] },
        }),
    );
    if (["contributions", "other-user"].includes(scenario))
        await fixture.page.route("**/api/contribution/", (r) => r.fulfill({ json: submissions }));
    if (scenario === "contributions-error")
        await fixture.page.route("**/api/contribution/", (r) =>
            r.fulfill({
                status: 503,
                json: {
                    message: "Contributions are temporarily unavailable.",
                    requestId: "synthetic-profile-request",
                },
            }),
        );
    return { ...fixture, user, submissions };
}
