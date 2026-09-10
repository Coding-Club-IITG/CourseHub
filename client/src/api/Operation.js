import { transport } from "./http";

export const operationEvent = "coursehub-operation";
export const getOperation = (id, signal) => transport.json(`operations/${id}`, { signal });
export const listOperations = (signal) => transport.json("operations", { signal });
export const retryOperation = (id) =>
    transport.json(`operations/${id}/retry`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
    });
export const cancelOperation = (id) =>
    transport.json(`operations/${id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
    });
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
