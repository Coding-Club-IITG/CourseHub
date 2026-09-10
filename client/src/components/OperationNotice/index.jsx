import { useUploadDialog } from "../../screens/contributions/dialogContext";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { operationEvent, listOperations, getOperation } from "../../api/Operation";
import "./styles.scss";

const active = ["planning", "queued", "running", "cancelling"];
const labels = {
    planning: "Preparing",
    awaiting: "Waiting for files",
    queued: "Scheduled",
    running: "In progress",
    completed: "Completed",
    failed: "Needs attention",
    partial: "Some files failed",
    cancelling: "Cancelling",
    cancelled: "Cancelled",
};
export default function OperationNotice() {
    const { open: uploadOpen } = useUploadDialog();
    const [items, setItems] = useState([]);
    const [error, setError] = useState("");
    const [attempt, setAttempt] = useState(0);
    useEffect(() => {
        const controller = new AbortController();
        listOperations(controller.signal)
            .then((data) => {
                if (!Array.isArray(data.items)) throw new Error("Invalid operation response");
                setItems(
                    data.items.filter((item) => !["completed", "cancelled"].includes(item.status)),
                );
                setError("");
            })
            .catch(() => {
                if (!controller.signal.aborted) setError("Operation status is unavailable.");
            });
        const update = ({ detail }) =>
            setItems((current) =>
                [detail, ...current.filter((item) => item.id !== detail.id)].slice(0, 20),
            );
        window.addEventListener(operationEvent, update);
        return () => {
            controller.abort();
            window.removeEventListener(operationEvent, update);
        };
    }, [attempt]);
    useEffect(() => {
        const controller = new AbortController();
        const ids = items.filter((item) => active.includes(item.status)).map((item) => item.id);
        if (!ids.length) return;
        const timer = setTimeout(async () => {
            try {
                const updated = await Promise.all(
                    ids.map((id) => getOperation(id, controller.signal)),
                );
                setItems((current) =>
                    current.map((item) => updated.find((next) => next.id === item.id) || item),
                );
                setError("");
            } catch {
                if (!controller.signal.aborted)
                    setError("Status refresh failed. The operation may still be running.");
            }
        }, 2000);
        return () => {
            clearTimeout(timer);
            controller.abort();
        };
    }, [items, attempt]);
    if (uploadOpen || (!items.length && !error)) return null;
    return (
        <aside className="operation-notice" aria-label="Content operations">
            {error && (
                <p role="alert">
                    {error}{" "}
                    <button type="button" onClick={() => setAttempt((value) => value + 1)}>
                        Retry status
                    </button>
                </p>
            )}
            {items.slice(0, 3).map((item) => (
                <div className="operation-notice-item" key={item.id}>
                    <span role="status">
                        {item.name}: {labels[item.status] || item.status}
                    </span>
                    {item.kind === "upload" && item.entries?.length > 0 && (
                        <p>
                            {item.entries.filter((entry) => entry.state === "completed").length} /{" "}
                            {item.entries.length} uploaded
                        </p>
                    )}
                    {item.kind !== "upload" && item.error?.message && <p>{item.error.message}</p>}
                    <div className="operation-notice-actions">
                        {item.kind === "upload" && item.folderId && (
                            <Link
                                to={`/browse/${item.courseCode}/${item.folderId}?upload=${item.id}`}
                            >
                                View upload
                            </Link>
                        )}
                        {item.kind === "delete" && item.status === "failed" && (
                            <p>
                                An administrator can retry cleanup. Completed steps are preserved.
                            </p>
                        )}
                        {!active.includes(item.status) && (
                            <button
                                type="button"
                                onClick={() =>
                                    setItems((current) =>
                                        current.filter((other) => other.id !== item.id),
                                    )
                                }
                            >
                                Dismiss
                            </button>
                        )}
                    </div>
                </div>
            ))}
        </aside>
    );
}
