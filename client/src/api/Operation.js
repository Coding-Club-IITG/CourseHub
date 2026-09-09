import API from "./http";

export const operationEvent = "coursehub-operation";
export const getOperation = async (id, signal) =>
    (await API.get(`/operations/${id}`, { signal })).data;
export const listOperations = async (signal) => (await API.get("/operations", { signal })).data;
export const retryOperation = async (id) => (await API.post(`/operations/${id}/retry`, {})).data;
export const cancelOperation = async (id) => (await API.post(`/operations/${id}/cancel`, {})).data;
export const announceOperation = (operation) =>
    window.dispatchEvent(new CustomEvent(operationEvent, { detail: operation }));

export async function waitForOperation(accepted) {
    if (!accepted?.operationId) return accepted;
    announceOperation({
        id: accepted.operationId,
        kind: "delete",
        status: "queued",
        name: "Content deletion",
        entries: [],
    });
    for (;;) {
        const operation = await getOperation(accepted.operationId);
        announceOperation(operation);
        if (operation.status === "completed") return operation;
        if (["failed", "cancelled"].includes(operation.status)) {
            const error = new Error(
                operation.error?.message ||
                    "The operation could not finish. Check its status to retry.",
            );
            error.operationId = operation.id;
            throw error;
        }
        await new Promise((resolve) => setTimeout(resolve, 1000));
    }
}
