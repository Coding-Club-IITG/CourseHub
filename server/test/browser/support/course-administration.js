import { adminExperienceFixture } from "./admin-experience.js";
export async function courseAdministrationFixture(browser, { width = 1440, count = 21 } = {}) {
    const fixture = await adminExperienceFixture(browser, { width }),
        { page } = fixture;
    const state = {
        items: Array.from({ length: count }, (_, i) => ({
            _id: "507f1f77bcf86cd79944" + String(i + 100).padStart(4, "0"),
            code: "QA" + String(i + 1).padStart(3, "0"),
            name: `Course [literal] ${i + 1}`,
            duplicate: false,
            withoutBR: i % 2 === 1,
        })),
        lists: [],
        failure: false,
        hold: null,
        saves: 0,
        listFailure: false,
    };
    await page.route("**/api/admin/dbcourses?*", async (route) => {
        const q = new URL(route.request().url()).searchParams,
            search = (q.get("q") || "").toLowerCase(),
            page = Number(q.get("page")),
            pageSize = Number(q.get("pageSize"));
        state.lists.push(Object.fromEntries(q));
        if (state.listFailure)
            return route.fulfill({
                status: 503,
                json: { message: "Course coverage is unavailable." },
            });
        const items = state.items.filter(
            (item) =>
                (item.code + " " + item.name).toLowerCase().includes(search) &&
                (q.get("duplicates") !== "true" || item.duplicate) &&
                (q.get("nameless") !== "true" || !item.name) &&
                (q.get("withoutBR") !== "true" || item.withoutBR),
        );
        await route.fulfill({
            json: {
                items: items.slice((page - 1) * pageSize, page * pageSize),
                page,
                pageSize,
                total: items.length,
            },
        });
    });
    await page.route(/\/api\/admin\/course\/[^/?]+(?:\/delete)?$/, async (route) => {
        const request = route.request(),
            code = decodeURIComponent(new URL(request.url()).pathname.split("/")[4]).toUpperCase();
        if (state.hold) await state.hold;
        if (state.failure)
            return route.fulfill({
                status: 409,
                json: {
                    message: "This course code is already in use or reserved by an earlier course.",
                },
            });
        if (request.method() === "DELETE") {
            state.items = state.items.filter((item) => item.code !== code);
            return route.fulfill({ json: { status: "completed" } });
        }
        state.saves++;
        const body = JSON.parse(request.postData()),
            item = state.items.find((item) => item.code === code);
        Object.assign(item, { code: body.newCode, name: body.name });
        return route.fulfill({ json: item });
    });
    return { ...fixture, state };
}
