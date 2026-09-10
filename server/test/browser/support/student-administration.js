import { adminExperienceFixture } from "./admin-experience.js";
export async function studentAdministrationFixture(browser, { width = 1440, count = 25 } = {}) {
    const fixture = await adminExperienceFixture(browser, { width });
    const { page } = fixture;
    const users = Array.from({ length: count }, (_, i) => ({
        ...fixture.users[0],
        _id: "507f1f77bcf86cd79943" + String(i + 100).padStart(4, "0"),
        name: `Student ${String(i + 1).padStart(2, "0")}`,
        email: `member-${i}@example.test`,
        rollNumber: 240100000 + i,
        isRegistered: true,
        isBR: i % 2 === 0,
    }));
    const pending = {
        _id: "507f1f77bcf86cd799439099",
        name: "Pending registration",
        email: "pending@example.test",
        rollNumber: "PENDING",
        isRegistered: false,
        isBR: true,
    };
    const state = {
        users,
        pending,
        failAction: false,
        hold: null,
        holdQuery: "",
        lists: [],
        details: [],
        mutations: [],
    };
    await page.route("**/api/student/all?*", async (route) => {
        const url = new URL(route.request().url()),
            q = url.searchParams.get("q") || "",
            br = url.searchParams.get("isBR") === "true",
            page = Number(url.searchParams.get("page")),
            pageSize = Number(url.searchParams.get("pageSize"));
        state.lists.push({ q, br, page, pageSize });
        if (state.hold && q === state.holdQuery) await state.hold;
        const items = [...state.users, ...(br ? [state.pending] : [])].filter(
            (item) =>
                (!br || item.isBR) &&
                [item.name, item.email, String(item.rollNumber)].some((value) =>
                    value.toLowerCase().includes(q.toLowerCase()),
                ),
        );
        await route
            .fulfill({
                json: {
                    items: items.slice((page - 1) * pageSize, page * pageSize),
                    page,
                    pageSize,
                    total: items.length,
                },
            })
            .catch(() => {});
    });
    await page.route(/\/api\/student\/[a-f0-9]{24}$/, async (route) => {
        const req = route.request(),
            id = new URL(req.url()).pathname.split("/").pop();
        if (req.method() === "GET") {
            state.details.push(id);
            return route.fulfill({ json: { item: state.users.find((item) => item._id === id) } });
        }
        state.mutations.push(id);
        if (state.failAction)
            return route.fulfill({
                status: 503,
                json: { message: "The student could not be deleted. Please retry." },
            });
        state.users = state.users.filter((item) => item._id !== id);
        return route.fulfill({ json: { message: "Student profile deleted." } });
    });
    await page.route("**/api/student/refresh/*", (route) => {
        state.mutations.push("refresh");
        return route.fulfill({
            status: 503,
            json: { message: "Course refresh could not finish. Please retry." },
        });
    });
    await page.route("**/api/br/delete", (route) => {
        state.mutations.push("remove-br");
        return route.fulfill({
            status: 503,
            json: { message: "BR access could not be removed. Please retry." },
        });
    });
    return { ...fixture, state };
}
