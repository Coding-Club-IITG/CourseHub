import { useState } from "react";
import { useLocation } from "react-router-dom";
import {
    Button,
    Icon,
    CloseIcon,
    IconButton,
    LoadingState,
    ErrorState,
    EmptyState,
} from "@coursehub/ui";
import { fetchCourses } from "../apis/courses";
import { library } from "../session";
import { usePagedList } from "../queries/usePagedList";
import Pagination from "../components/Pagination";
import CourseFilters from "./courses/CourseFilters";
import CourseTable from "./courses/CourseTable";
import CourseEditor from "./courses/CourseEditor";
import CourseDelete from "./courses/CourseDelete";
import ImportDialog from "../components/imports/ImportDialog";
import styles from "@/styles/layout.module.scss";
import courseStyles from "./courses/styles.module.scss";
export default function Courses() {
    const state = usePagedList("courses", fetchCourses, ["nameless", "duplicates"]);
    const { query, filters, update } = state;
    const location = useLocation();
    const [editing, setEditing] = useState(null),
        [deleting, setDeleting] = useState(null),
        [importing, setImporting] = useState(() =>
            new URLSearchParams(location.search).has("import"),
        ),
        [result, setResult] = useState("");
    const changed = (message) => {
        setResult(message);
        library.invalidate();
    };
    return (
        <section className={styles.page}>
            <header className={styles.panel}>
                <div className={styles.pageHeader}>
                    <div>
                        <h1 className={styles.heading}>Courses</h1>
                        <p>Manage course titles, codes and library content.</p>
                    </div>
                    <Button onClick={() => setImporting(true)}>
                        <Icon name="plus" />
                        Add Courses
                    </Button>
                </div>
                <CourseFilters {...state} />
            </header>
            {result && (
                <div role="status" className={courseStyles.status}>
                    <span>{result}</span>
                    <IconButton
                        label="Dismiss result"
                        variant="ghost"
                        onClick={() => setResult("")}
                    >
                        <CloseIcon />
                    </IconButton>
                </div>
            )}
            <div className={styles.panel}>
                <h2>Course list</h2>
                {query.isPending ? (
                    <LoadingState title="Loading courses…" />
                ) : query.isError ? (
                    <ErrorState
                        title="We couldn’t load courses."
                        error={query.error}
                        onRetry={() => query.refetch()}
                    />
                ) : query.data.items.length ? (
                    <CourseTable
                        items={query.data.items}
                        onEdit={setEditing}
                        onDelete={setDeleting}
                    />
                ) : (
                    <EmptyState title="No courses found">
                        Try another search or reset the filters.
                    </EmptyState>
                )}
                <Pagination
                    page={filters.page}
                    pageSize={filters.pageSize}
                    total={query.data?.total || 0}
                    loading={query.isPending}
                    onPage={(page) => update({ page })}
                    onPageSize={(pageSize) => update({ pageSize, page: 1 })}
                />
            </div>
            {editing && (
                <CourseEditor
                    key={editing._id || editing.code}
                    course={editing}
                    onClose={() => setEditing(null)}
                    onSuccess={changed}
                />
            )}{" "}
            {deleting && (
                <CourseDelete
                    course={deleting}
                    onClose={() => setDeleting(null)}
                    onSuccess={changed}
                />
            )}{" "}
            {importing && (
                <ImportDialog
                    type="courses"
                    onClose={() => setImporting(false)}
                    onSuccess={changed}
                />
            )}
        </section>
    );
}
