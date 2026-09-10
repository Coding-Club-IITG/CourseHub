import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@coursehub/browser";
import { Button, FormField, Input, LoadingState, ErrorState } from "@coursehub/ui";
import { library } from "../session";
import CoursesWithoutBRTable from "../components/CoursesWithoutBRTable";
import { fetchCoursesWithoutBR } from "../apis/br";
import styles from "../styles/layout.module.scss";
export default function CoursesWithoutBR() {
    const [search, setSearch] = useState("");
    const query = useQuery(
        library.options("without-br", "", async ({ signal }) => {
            const data = await fetchCoursesWithoutBR(signal);
            if (!Array.isArray(data.coursesWithoutBR))
                throw new Error("The course list could not be read. Please try again.");
            return data.coursesWithoutBR;
        }),
    );
    const term = search.trim().toLowerCase(),
        courses = (query.data || []).filter((course) =>
            [course.code, course.name].some((value) => value?.toLowerCase().includes(term)),
        );
    return (
        <section className={styles.page}>
            <header className={styles.pageHeader}>
                <div>
                    <h1 className={styles.heading}>Courses Without BR</h1>
                    <p className={styles.muted}>
                        Courses without a registered BR who has a current or historical academic
                        allotment for them.
                    </p>
                </div>
                <Link className={styles.link} to="/admin/students?isBR=true">
                    Manage BRs
                </Link>
            </header>
            <section className={`${styles.panel} ${styles.stack}`}>
                <div className={`${styles.toolbar} ${styles.alignEnd}`}>
                    <FormField label="Search courses" className={styles.grow}>
                        <Input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Code or name"
                        />
                    </FormField>
                    <Button
                        variant="secondary"
                        onClick={() => query.refetch()}
                        busy={query.isFetching}
                        busyLabel="Refreshing…"
                    >
                        Refresh
                    </Button>
                </div>
                {query.error && (
                    <ErrorState
                        title="Could not load courses without BR"
                        error={query.error}
                        onRetry={query.refetch}
                    />
                )}{" "}
                {query.isPending ? (
                    <LoadingState title="Loading courses…" />
                ) : (
                    query.data && <CoursesWithoutBRTable courses={courses} />
                )}
            </section>
        </section>
    );
}
