import styles from "@/styles/layout.module.scss";
import { useEffect, useState } from "react";
import { operationEvent } from "@/apis/operations";

export default function OperationNotice() {
    const [operation, setOperation] = useState(null);
    useEffect(() => {
        const update = (event) => setOperation(event.detail || { status: "queued" });
        window.addEventListener(operationEvent, update);
        return () => window.removeEventListener(operationEvent, update);
    }, []);
    const activity =
        operation?.kind === "academic-sync"
            ? "Course refresh"
            : operation?.kind === "rename"
              ? "Course update"
              : operation?.kind === "link"
                ? "Linking"
                : operation?.kind === "upload"
                  ? "Upload"
                  : "Cleanup";
    if (!operation) return null;
    return (
        <div className={styles.operationNotice}>
            {operation && (
                <span role="status">
                    {operation.status === "completed"
                        ? `${activity} completed.`
                        : operation.status === "failed"
                          ? `${activity} needs attention.`
                          : `${activity} is in progress. You can leave this page.`}
                </span>
            )}
        </div>
    );
}
