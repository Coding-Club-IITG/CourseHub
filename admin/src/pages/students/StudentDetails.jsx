import { useQuery } from "@coursehub/browser";
import { ErrorState, LoadingState } from "@coursehub/ui";
import { fetchStudentDetails } from "../../apis/student";
import { library } from "../../session";
import styles from "./styles.module.scss";
export default function StudentDetails({ id }) {
    const query = useQuery({
        queryKey: library.key("student-detail", id),
        queryFn: ({ signal }) => fetchStudentDetails(id, signal),
        retry: false,
    });
    if (query.isPending) return <LoadingState title="Loading student details…" />;
    if (query.isError)
        return (
            <ErrorState
                title="Could not load student details"
                error={query.error}
                onRetry={() => query.refetch()}
            />
        );
    const item = query.data.item;
    return (
        <div className={styles.details}>
            <dl>
                <div>
                    <dt>Department</dt>
                    <dd>{item.department || "Unavailable"}</dd>
                </div>
                <div>
                    <dt>BR access</dt>
                    <dd>{item.isBR ? "Assigned in the BR registry" : "Not assigned"}</dd>
                </div>
                <div>
                    <dt>Last course refresh</dt>
                    <dd>
                        {item.courseSync?.lastSucceededAt
                            ? new Date(item.courseSync.lastSucceededAt).toLocaleString()
                            : "No completed refresh recorded"}
                    </dd>
                </div>
            </dl>
            <section>
                <h3>Current registered courses</h3>
                {item.courses?.length ? (
                    <ul>
                        {item.courses.map((course) => (
                            <li key={course.code}>
                                <strong>{course.code}</strong> - {course.name}
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p>No current registrations recorded.</p>
                )}
            </section>
            {!!item.previousCourses?.length && (
                <section>
                    <h3>Previous registrations</h3>
                    {item.previousCourses.map((term, index) => (
                        <details key={index}>
                            <summary>
                                Semester {term.semester} ({term.year})
                            </summary>
                            <ul>
                                {term.courses?.map((course) => (
                                    <li key={course.code}>
                                        {course.code} - {course.name}
                                    </li>
                                ))}
                            </ul>
                        </details>
                    ))}
                </section>
            )}
            {!!item.readOnly?.length && (
                <section>
                    <h3>Other saved courses</h3>
                    <p>These do not grant BR management rights.</p>
                    <ul>
                        {item.readOnly.map((course) => (
                            <li key={course.code}>
                                {course.code} - {course.name}
                            </li>
                        ))}
                    </ul>
                </section>
            )}
        </div>
    );
}
