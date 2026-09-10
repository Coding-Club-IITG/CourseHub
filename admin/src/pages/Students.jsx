import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import {
    Button,
    Icon,
    CloseIcon,
    EmptyState,
    ErrorState,
    IconButton,
    LoadingState,
} from "@coursehub/ui";
import { library } from "../session";
import AddBRs from "../components/AddBRs";
import Pagination from "../components/Pagination";
import StudentTable from "./students/StudentTable";
import StudentFilters from "./students/StudentFilters";
import ManagementDialog from "./students/ManagementDialog";
import { useStudents } from "./students/useStudents";
import styles from "@/styles/layout.module.scss";
import studentStyles from "./students/styles.module.scss";
export default function Students() {
    const { query, filters, search, setSearch, update, reset } = useStudents();
    const location = useLocation();
    const [expanded, setExpanded] = useState(null),
        [action, setAction] = useState(null),
        [adding, setAdding] = useState(() => new URLSearchParams(location.search).has("import")),
        [success, setSuccess] = useState("");
    useEffect(() => setExpanded(null), [filters.q, filters.isBR, filters.page, filters.pageSize]);
    const changed = (message) => {
        if (message) setSuccess(message);
        library.invalidate();
    };
    return (
        <section className={styles.page}>
            <header className={styles.panel}>
                <div className={styles.pageHeader}>
                    <div>
                        <h1 className={styles.heading}>Students</h1>
                        <p>View students and manage BR registry assignments.</p>
                    </div>
                    <div className={styles.toolbar}>
                        {filters.isBR && (
                            <Button onClick={() => setAdding(true)}>
                                <Icon name="plus" />
                                Add BRs
                            </Button>
                        )}
                        <Button
                            variant="secondary"
                            onClick={() => setAction({ type: "refresh-all" })}
                        >
                            <Icon name="refresh" /> Refresh all courses
                        </Button>
                    </div>
                </div>
                <StudentFilters {...{ filters, search, setSearch, update, reset }} />
            </header>
            {success && (
                <div className={studentStyles.status} role="status">
                    <span>{success}</span>
                    <IconButton
                        label="Dismiss result"
                        variant="ghost"
                        onClick={() => setSuccess("")}
                    >
                        <CloseIcon />
                    </IconButton>
                </div>
            )}
            <div className={styles.panel}>
                <h2>{filters.isBR ? "Branch Representatives" : "Student Table"}</h2>
                {query.isPending ? (
                    <LoadingState title="Loading students…" />
                ) : query.isError ? (
                    <ErrorState
                        title="Could not load students"
                        error={query.error}
                        onRetry={() => query.refetch()}
                    />
                ) : query.data.items.length ? (
                    <StudentTable
                        items={query.data.items}
                        expanded={expanded}
                        onExpand={(id) => setExpanded((current) => (current === id ? null : id))}
                        onAction={setAction}
                    />
                ) : (
                    <EmptyState title="No students found">
                        Try another search or reset the filters.
                    </EmptyState>
                )}
                <Pagination
                    page={filters.page}
                    pageSize={filters.pageSize}
                    total={query.data?.total || 0}
                    loading={query.isPending || query.isError}
                    onPage={(page) => update({ page })}
                    onPageSize={(pageSize) => update({ pageSize, page: 1 })}
                />
            </div>
            {adding && <AddBRs onClose={() => setAdding(false)} onSuccess={() => changed()} />}
            {action && (
                <ManagementDialog
                    key={action.type + (action.item?._id || "")}
                    action={action}
                    onClose={() => setAction(null)}
                    onSuccess={changed}
                />
            )}
        </section>
    );
}
