import workflow from "../styles/workflows.module.scss";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Button, FormField, Input, ErrorState, LoadingState } from "@coursehub/ui";
import { normalizeCourseCode, isCourseCode } from "@coursehub/domain";
import { linkCourse, linkCsv } from "../apis/linking";
import { activeOperation, useOperation } from "../queries/useOperation";
import { useWorkflowLocation } from "../queries/useWorkflowLocation";
import OperationCard from "../components/operations/OperationCard";
import styles from "../styles/layout.module.scss";
export default function CourseLinking() {
    const { params, update } = useWorkflowLocation(),
        [tab, setTab] = useState(params.has("receipt") ? "bulk" : "manual"),
        [oldCode, setOldCode] = useState(""),
        [newCode, setNewCode] = useState(""),
        [file, setFile] = useState(null),
        [busy, setBusy] = useState(false),
        [error, setError] = useState(null),
        [summary, setSummary] = useState(null);
    const operation = useOperation(params.get("operation")),
        receipt = useOperation(params.get("receipt")),
        batch = receipt.data?.batchLinking || summary;
    const scheduled = [
        ...new Map((batch?.operations || []).map((item) => [item.operationId, item])).values(),
    ];
    const submit = async (event) => {
        event.preventDefault();
        setBusy(true);
        setError(null);
        try {
            if (tab === "bulk") {
                if (file.size > 1024 * 1024)
                    throw new Error("Choose a CSV file no larger than 1 MiB.");
                const result = await linkCsv(file);
                setSummary(result.summary);
                const id = result.summary.receiptId;
                update({ receipt: id, operation: result.summary.operations[0]?.operationId });
            } else {
                const source = normalizeCourseCode(oldCode),
                    target = normalizeCourseCode(newCode);
                if (!isCourseCode(source) || !isCourseCode(target))
                    throw new Error("Enter valid course codes.");
                const result = await linkCourse(source, target);
                update({ operation: result.operationId, receipt: undefined });
                setSummary(null);
            }
        } catch (failure) {
            setError(failure);
        } finally {
            setBusy(false);
        }
    };
    return (
        <section className={styles.page}>
            <header>
                <h1 className={styles.heading}>Course Linking</h1>
                <p className={styles.muted}>Share legacy course folders with a new course code.</p>
            </header>
            <div className={workflow.guidance}>
                <p>
                    Only empty structures are replaced. Populated duplicate years are skipped and
                    their content is kept.
                </p>
                <p>
                    Folders remain shared. Removing a shared folder unlinks the active course, while
                    deleting a shared file removes it from every referencing course.
                </p>
            </div>
            <div className={styles.toolbar}>
                <Button
                    variant={tab === "manual" ? "primary" : "secondary"}
                    aria-pressed={tab === "manual"}
                    disabled={busy}
                    onClick={() => setTab("manual")}
                >
                    Single Course Link
                </Button>
                <Button
                    variant={tab === "bulk" ? "primary" : "secondary"}
                    aria-pressed={tab === "bulk"}
                    disabled={busy}
                    onClick={() => setTab("bulk")}
                >
                    Bulk Link (CSV)
                </Button>
            </div>
            <form className={`${styles.panel} ${styles.stack}`} onSubmit={submit}>
                {tab === "manual" ? (
                    <>
                        <h2 className={styles.heading}>Link a Single Course</h2>
                        <div className={styles.grid}>
                            <FormField label="Legacy Course Code" required>
                                <Input
                                    value={oldCode}
                                    onChange={(e) => setOldCode(e.target.value)}
                                    placeholder="Eg. CS101"
                                    disabled={busy || activeOperation(operation.data)}
                                />
                            </FormField>
                            <FormField label="New Course Code" required>
                                <Input
                                    value={newCode}
                                    onChange={(e) => setNewCode(e.target.value)}
                                    placeholder="Eg. CSN101"
                                    disabled={busy}
                                />
                            </FormField>
                        </div>
                    </>
                ) : (
                    <>
                        <h2 className={styles.heading}>Upload CSV</h2>
                        <p>
                            Use two columns: legacy course code, then new course code. Headers are
                            optional. Up to 1,000 rows and 1 MiB.
                        </p>
                        <FormField label="CSV file">
                            <Input
                                id="csv-upload"
                                type="file"
                                accept=".csv,text/csv"
                                disabled={busy}
                                onChange={(e) => setFile(e.target.files[0] || null)}
                            />
                        </FormField>
                    </>
                )}
                {error && <ErrorState title="Could not schedule linking" error={error} />}
                <div>
                    <Button
                        type="submit"
                        busy={busy}
                        busyLabel="Scheduling…"
                        disabled={
                            activeOperation(operation.data) ||
                            (tab === "bulk" ? !file : !oldCode || !newCode)
                        }
                    >
                        {tab === "bulk" ? "Upload and Link" : "Link Course"}
                    </Button>
                </div>
            </form>
            {batch && (
                <section
                    className={`${styles.panel} ${styles.stack}`}
                    aria-label="Bulk linking receipt"
                >
                    <h2 className={styles.heading}>Bulk linking</h2>
                    <p>
                        {batch.scheduled} scheduled · {batch.failed} could not be scheduled
                    </p>
                    {batch.errors.length > 0 && (
                        <ul
                            className={`${styles.warning} ${workflow.results}`}
                            tabIndex={0}
                            aria-label="Rows not scheduled"
                        >
                            {batch.errors.map((row, i) => (
                                <li key={i}>
                                    {row.oldCode} → {row.newCode}: {row.error}
                                </li>
                            ))}
                        </ul>
                    )}
                    {batch.operations.length > 0 && (
                        <FormField label="Scheduled link">
                            <select
                                value={params.get("operation") || ""}
                                onChange={(e) => update({ operation: e.target.value })}
                            >
                                {scheduled.map((item) => (
                                    <option key={item.operationId} value={item.operationId}>
                                        {item.oldCode} → {item.newCode}
                                    </option>
                                ))}
                            </select>
                        </FormField>
                    )}
                    <p className={styles.small}>
                        Scheduled work continues on the server. Select a link to check its progress
                        and retained result.
                    </p>
                </section>
            )}
            {(operation.error || receipt.error) && (
                <ErrorState
                    title="Could not update linking status"
                    error={operation.error || receipt.error}
                    onRetry={() => {
                        operation.refetch();
                        if (params.has("receipt")) receipt.refetch();
                    }}
                />
            )}
            {params.has("operation") && operation.isPending && (
                <LoadingState title="Loading linking status…" />
            )}
            {operation.data && (
                <OperationCard item={operation.data} onRetried={() => operation.refetch()} />
            )}
            <Link
                className={styles.link}
                to={
                    params.has("operation")
                        ? `/admin/operations?operation=${params.get("operation")}`
                        : "/admin/operations"
                }
            >
                View in Operations
            </Link>
        </section>
    );
}
