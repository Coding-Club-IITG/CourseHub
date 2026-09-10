import { useUploadDialog } from "../../screens/contributions/dialogContext";
import { useContext, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { operationEvent, listOperations, getOperation } from "../../api/Operation";
import { createPortal } from "react-dom";
import { NotificationTarget } from "../../notifications/context";
import Notice from "../../notifications/Notice";
import styles from "../../notifications/styles.module.scss";

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
    const target = useContext(NotificationTarget);
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
    if (!target || uploadOpen || (!items.length && !error)) return null;
    return createPortal(
        <aside aria-label="Content operations">
            {error && (
                <Notice tone="error" message={error} onDismiss={() => setError("")}>
                    <p role="alert">{error}</p>
                    <div className={styles.actions}>
                        <button type="button" onClick={() => setAttempt((value) => value + 1)}>
                            Retry status
                        </button>
                    </div>
                </Notice>
            )}
            {items.slice(0, 3).map((item) => {
                const message = item.name + ": " + (labels[item.status] || item.status);
                return (
                    <Notice
                        key={item.id}
                        tone={
                            item.status === "failed"
                                ? "error"
                                : item.status === "partial"
                                  ? "warning"
                                  : item.status === "completed"
                                    ? "success"
                                    : "info"
                        }
                        message={message + (item.error?.message || "")}
                        persistent={active.includes(item.status) || item.status === "awaiting"}
                        onDismiss={() =>
                            setItems((current) => current.filter((other) => other.id !== item.id))
                        }
                    >
                        <span role="status">{message}</span>
                        {item.kind === "upload" && item.entries?.length > 0 && (
                            <p>
                                {item.entries.filter((entry) => entry.state === "completed").length}{" "}
                                / {item.entries.length} uploaded
                            </p>
                        )}
                        {item.kind !== "upload" && item.error?.message && (
                            <p>{item.error.message}</p>
                        )}
                        <div className={styles.actions}>
                            {item.kind === "upload" && item.folderId && (
                                <Link
                                    to={
                                        "/browse/" +
                                        item.courseCode +
                                        "/" +
                                        item.folderId +
                                        "?upload=" +
                                        item.id
                                    }
                                >
                                    View upload
                                </Link>
                            )}
                            {item.kind === "delete" && item.status === "failed" && (
                                <p>
                                    An administrator can retry cleanup. Completed steps are
                                    preserved.
                                </p>
                            )}
                        </div>
                    </Notice>
                );
            })}
        </aside>,
        target,
    );
}
