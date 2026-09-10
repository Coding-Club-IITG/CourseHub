import workflow from "../../styles/workflows.module.scss";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Badge, Button } from "@coursehub/ui";
import { retryOperation } from "../../apis/operations";
import ImportResults from "../imports/ImportResults";
import LinkingResult from "../LinkingResult";
import styles from "../../styles/layout.module.scss";
export default function OperationCard({ item, onRetried }) {
    const [busy, setBusy] = useState(false),
        [error, setError] = useState(null);
    const retry = async () => {
        setBusy(true);
        setError(null);
        try {
            const result = await retryOperation(item.id);
            await onRetried?.(result);
        } catch (failure) {
            setError(failure);
        } finally {
            setBusy(false);
        }
    };
    const entries = item.entries || [],
        steps = item.completedSteps || 0;
    const label = item.batchLinking
        ? "Scheduling"
        : {
              "academic-sync": "Course refresh",
              rename: "Course update",
              link: "Linking",
              delete: "Cleanup",
          }[item.kind];
    return (
        <article className={`${styles.panel} ${workflow.operation}`} aria-label={item.name}>
            <header className={`${styles.toolbar} ${styles.between}`}>
                <h2 className={`${styles.heading} ${styles.wrap} ${styles.grow}`}>
                    {item.name}
                    {item.courseCode && <span className={styles.muted}> · {item.courseCode}</span>}
                </h2>
                <Badge
                    tone={
                        item.status === "completed"
                            ? "success"
                            : ["failed", "partial"].includes(item.status)
                              ? "danger"
                              : "neutral"
                    }
                >
                    {item.status}
                </Badge>
            </header>
            {label && (
                <p role="status">
                    {item.status === "completed"
                        ? `${label} completed`
                        : ["queued", "running", "planning"].includes(item.status)
                          ? `${label} is in progress. You can leave this page.`
                          : `${label} needs attention.`}
                </p>
            )}
            <p className={`${styles.muted} ${styles.small}`}>
                {item.kind === "import"
                    ? `CSV import · ${item.import?.finished || 0} of ${item.import?.total || 0} rows finished`
                    : label
                      ? `${label} · ${steps} ${steps === 1 ? "step" : "steps"} completed`
                      : `${entries.filter((entry) => entry.state === "completed").length} of ${entries.length} files uploaded`}
            </p>
            {item.kind === "import" && item.import && (
                <>
                    <ImportResults {...item.import} />
                    <Link
                        className={styles.link}
                        to={`/admin/${item.import.type === "courses" ? "courses?" : "students?isBR=true&"}import=${item.id}`}
                    >
                        Open import
                    </Link>
                </>
            )}
            {item.batchLinking && (
                <>
                    <p>
                        {item.batchLinking.scheduled} link jobs scheduled ·{" "}
                        {item.batchLinking.failed} could not be scheduled. Each job has its own
                        completion status.
                    </p>
                    <Link
                        className={styles.link}
                        to={`/admin/course-linking?receipt=${item.id}&operation=${item.batchLinking.operations[0]?.operationId || ""}`}
                    >
                        Open bulk linking
                    </Link>
                </>
            )}
            {item.kind === "link" && (
                <LinkingResult result={item.linking} completed={item.status === "completed"} />
            )}
            {item.kind === "academic-sync" && item.synchronization && (
                <p>
                    {item.status === "completed" ? "Updated" : "Planned"}:{" "}
                    {item.synchronization.students ?? 0} students ·{" "}
                    {item.synchronization.allotments ?? 0} academic allotments ·{" "}
                    {item.synchronization.createdCourses ?? 0} new courses.
                </p>
            )}
            {item.affectedCourses?.length > 1 && (
                <p className={styles.wrap}>Affected courses: {item.affectedCourses.join(", ")}</p>
            )}
            {item.error?.message && <p className={styles.dangerText}>{item.error.message}</p>}
            {item.kind === "delete" && item.status === "failed" && (
                <p>
                    Content stays unavailable until cleanup finishes. Retry resumes the saved steps.
                </p>
            )}
            {entries.length > 0 && (
                <ul className={workflow.results} tabIndex={0} aria-label="File results">
                    {entries.map((entry) => (
                        <li key={entry.id} className={`${styles.wrap} ${styles.divider}`}>
                            {entry.name} - {entry.state}
                            {entry.error?.message && (
                                <p className={styles.dangerText}>{entry.error.message}</p>
                            )}
                        </li>
                    ))}
                </ul>
            )}
            {error && (
                <p role="alert" className={styles.error}>
                    {error.message}
                </p>
            )}
            {item.canRetry && (
                <div>
                    <Button variant="secondary" busy={busy} busyLabel="Scheduling…" onClick={retry}>
                        Retry unfinished work
                    </Button>
                </div>
            )}
        </article>
    );
}
