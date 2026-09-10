import { adminExperienceFixture } from "./admin-experience.js";
import { validateImportRows } from "../../../../packages/domain/src/index.js";
export const importId = "c187aa63-3885-4239-aab0-6b4036bc3773";
export async function importFixture(browser, { width = 1440, type = "courses" } = {}) {
    const fixture = await adminExperienceFixture(browser, { width }),
        { page } = fixture;
    const state = {
        type,
        rows: [],
        status: "queued",
        submissions: [],
        retries: 0,
        readFailure: false,
        submitFailure: false,
        previewFailure: false,
        revision: 0,
    };
    const plan = (rows) =>
        validateImportRows(type, rows).rows.map((row) => ({
            ...row,
            action: row.duplicateOf
                ? "skip"
                : type === "courses" && row.code === "CS101"
                  ? "update"
                  : "create",
            ...(row.code === "CS101" ? { previousName: fixture.courses[0].name } : {}),
        }));
    const operation = () => {
        const rows = state.rows.map((row, index) => ({
            ...row,
            state:
                state.status === "queued" && !(state.progress && index === 0)
                    ? "pending"
                    : state.status === "partial" && index === state.rows.length - 1
                      ? "failed"
                      : { create: "created", update: "updated", skip: "skipped" }[row.action],
            ...(state.status === "partial" && index === state.rows.length - 1
                ? { error: { message: "This row could not be saved. Please retry." } }
                : {}),
        }));
        const counts = Object.fromEntries(
            ["created", "updated", "skipped", "failed", "pending", "working"].map((key) => [
                key,
                rows.filter((row) => row.state === key).length,
            ]),
        );
        return {
            id: importId,
            kind: "import",
            name: "CSV import",
            status: state.status,
            createdAt: "2026-09-09T06:30:00Z",
            updatedAt: `2026-09-09T06:30:${String(state.revision).padStart(2, "0")}Z`,
            entries: [],
            completedSteps: 0,
            affectedCourses: [],
            canRetry: state.status === "partial",
            import: {
                type,
                rows,
                counts,
                total: rows.length,
                finished: rows.length - counts.pending,
            },
        };
    };
    await page.route("**/api/admin/imports/preview", async (route) => {
        if (state.previewFailure)
            return route.fulfill({
                status: 503,
                json: { message: "Preview is temporarily unavailable." },
            });
        const body = JSON.parse(route.request().postData());
        const rows = plan(body.rows);
        await route.fulfill({
            json: {
                type,
                rows,
                digest: "d".repeat(64),
                requestId: "d602b676-4faa-4949-9a86-d9e03694af6b",
                canSubmit: true,
            },
        });
    });
    await page.route(/\/api\/admin\/imports\/?$/, async (route) => {
        const body = JSON.parse(route.request().postData());
        state.submissions.push(body);
        state.rows = plan(body.rows);
        if (state.submitFailure)
            return route.fulfill({
                status: 503,
                json: {
                    message:
                        "The response was interrupted. Repeat submission to recover the same import.",
                },
            });
        await route.fulfill({
            status: 202,
            json: { operationId: importId, kind: "import", status: state.status },
        });
    });
    await page.route("**/api/operations/" + importId, (route) =>
        route.fulfill(
            state.readFailure
                ? { status: 503, json: { message: "Import status is temporarily unavailable." } }
                : { json: operation() },
        ),
    );
    await page.route("**/api/operations/" + importId + "/retry", (route) => {
        state.retries++;
        state.status = "completed";
        state.revision++;
        return route.fulfill({ status: 202, json: operation() });
    });
    return { ...fixture, state, operation };
}
