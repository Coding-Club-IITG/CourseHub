import { apiFetch } from "./http";
import { API_BASE_URL } from "./server";

async function request(path = "", options) {
    const response = await apiFetch(`${API_BASE_URL}api/operations${path}`, options);
    return response.json();
}
export const operationEvent = "coursehub-operation";
export const getOperation = (id, signal) => request(`/${id}`, { signal });
export const listOperations = (page, status, signal) =>
    request(`?page=${page}&pageSize=20${status ? `&status=${status}` : ""}`, { signal });
export const retryOperation = (id) => request(`/${id}/retry`, { method: "POST" });
export async function waitForOperation(accepted) {
    if (!accepted?.operationId) return accepted;
    window.dispatchEvent(
        new CustomEvent(operationEvent, {
            detail: { kind: accepted.kind || "delete", status: "queued" },
        }),
    );
    for (;;) {
        const operation = await getOperation(accepted.operationId);
        window.dispatchEvent(new CustomEvent(operationEvent, { detail: operation }));
        if (operation.status === "completed") return operation;
        if (["failed", "cancelled"].includes(operation.status))
            throw new Error(
                operation.error?.message ||
                    "The operation could not finish. Open Operations to review and retry.",
            );
        await new Promise((resolve) => setTimeout(resolve, 1000));
    }
}
