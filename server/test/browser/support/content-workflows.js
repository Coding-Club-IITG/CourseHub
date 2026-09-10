import { adminExperienceFixture } from "./admin-experience.js";
import { deletionOperation } from "../../fixtures/operations.js";
import { linkingOperation } from "../../fixtures/linking.js";
export async function contentWorkflowFixture(browser, { width = 390 } = {}) {
    const f = await adminExperienceFixture(browser, { width, scenario: "course-dashboard" }),
        job = linkingOperation("running");
    const receipt = {
        ...linkingOperation(),
        id: "b10a1010-1010-4010-a010-101010101010",
        name: "Bulk link scheduling",
        linking: undefined,
        batchLinking: {
            scheduled: 1,
            failed: 1,
            errors: [{ oldCode: "MISSING", newCode: "CS201", error: "Course not found" }],
            operations: [{ oldCode: "CS101", newCode: "CS201", operationId: job.id }],
        },
    };
    receipt.batchLinking.receiptId = receipt.id;
    const state = {
        operation: deletionOperation("running"),
        job,
        receipt,
        failAction: false,
        failStatus: false,
        failRetry: false,
        approved: false,
        capable: true,
        actions: [],
    };
    await f.context.route("**/api/**", async (route) => {
        const r = route.request(),
            p = new URL(r.url()).pathname;
        let status = 200,
            data;
        if (p.endsWith("/dashboard")) {
            const course = structuredClone(f.courses[0]);
            const decorate = (node) => {
                node.capabilities = { canManage: state.capable, canModerate: state.capable };
                node.affectedCourses = ["CS101", "MA101"];
                node.children?.forEach(decorate);
            };
            if (state.deep) {
                let node = {
                    ...course.children[0].children[0].children[0],
                    name: "Lecture " + "very-long-title-".repeat(25) + ".pdf",
                };
                for (let depth = 0; depth < 10; depth++)
                    node = {
                        _id: "level-" + depth,
                        name: "Nested lecture material " + depth,
                        children: [node],
                        childType: "Folder",
                    };
                course.children = [node];
            }
            decorate(course);
            data = {
                course,
                studentCount: 3,
                contributions: state.approved
                    ? []
                    : [
                          {
                              contributionId: "shared-submission",
                              approved: false,
                              files: [
                                  {
                                      name: "Shared pending notes.pdf",
                                      affectedCourses: ["CS101", "MA101"],
                                  },
                              ],
                          },
                      ],
            };
        } else if (p.includes("/admin/node/") || p === "/api/admin/contribution/action") {
            if (state.holdAction) await state.holdAction;
            const body = r.postDataJSON();
            state.actions.push({ path: p, ...body });
            if (state.failAction) {
                status = 403;
                data = {
                    message: "This action is no longer permitted.",
                    requestId: "content-action-request",
                };
            } else if (body.action === "approve") {
                state.approved = true;
                data = { success: true };
            } else {
                status = 202;
                data = { operationId: state.operation.id };
            }
        } else if (p.endsWith("/bulk-link")) {
            status = 202;
            data = { summary: receipt.batchLinking };
        } else if (p.startsWith("/api/operations/")) {
            const id = p.split("/")[3];
            if (p.endsWith("/retry")) {
                if (state.failRetry) {
                    status = 503;
                    data = { message: "Retry could not be scheduled." };
                } else {
                    state.operation =
                        state.operation.kind === "academic-sync"
                            ? {
                                  ...state.operation,
                                  status: "completed",
                                  canRetry: false,
                                  error: undefined,
                              }
                            : deletionOperation("completed");
                    state.job = linkingOperation();
                    data = id === state.job.id ? state.job : state.operation;
                    status = 202;
                }
            } else if (state.failStatus) {
                status = 503;
                data = { message: "Status temporarily unavailable." };
            } else data = id === receipt.id ? receipt : id === job.id ? state.job : state.operation;
        } else return route.fallback();
        await route.fulfill({ status, json: data });
    });
    return { ...f, state };
}
