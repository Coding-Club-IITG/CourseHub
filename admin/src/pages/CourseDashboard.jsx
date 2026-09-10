import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@coursehub/browser";
import { LoadingState, ErrorState, EmptyState } from "@coursehub/ui";
import { library } from "../session";
import { fetchCourseDashboardData } from "../apis/courses";
import { useOperation } from "../queries/useOperation";
import { useWorkflowLocation } from "../queries/useWorkflowLocation";
import OperationCard from "../components/operations/OperationCard";
import ContentTree from "./content/ContentTree";
import { countVerified } from "./content/countVerified";
import ModerationList from "./content/ModerationList";
import ContentActionDialog from "./content/ContentActionDialog";
import styles from "../styles/layout.module.scss";
import content from "./content/styles.module.scss";
export default function CourseDashboard() {
    const { code } = useParams(),
        { params, update } = useWorkflowLocation(),
        [target, setTarget] = useState(null),
        [result, setResult] = useState("");
    const query = useQuery(
            library.options("dashboard", code, ({ signal }) =>
                fetchCourseDashboardData(code, signal),
            ),
        ),
        operation = useOperation(params.get("operation")),
        data = query.data;
    const accepted = (response, message) => {
        if (response.operationId) {
            update({ operation: response.operationId });
            setResult("");
        } else {
            setResult(message);
            library.invalidate([code]);
        }
    };
    return (
        <section className={styles.page}>
            <header className={styles.pageHeader}>
                <h1 className={`${styles.heading} ${styles.wrap}`}>
                    {data?.course?.code || code}
                    {data?.course?.name && (
                        <span className={styles.muted}> · {data.course.name}</span>
                    )}
                </h1>
                <Link className={styles.link} to="/admin/courses">
                    Back to courses
                </Link>
            </header>
            {result && (
                <p role="status" className={styles.success}>
                    {result}
                </p>
            )}
            {operation.error && (
                <ErrorState
                    title="Could not update cleanup status"
                    error={operation.error}
                    onRetry={operation.refetch}
                />
            )}
            {params.get("operation") && operation.isPending && (
                <LoadingState title="Loading cleanup status…" />
            )}
            {operation.data && (
                <OperationCard item={operation.data} onRetried={() => operation.refetch()} />
            )}
            {query.error && (
                <ErrorState
                    title="Could not load course dashboard"
                    error={query.error}
                    onRetry={query.refetch}
                />
            )}
            {query.isPending ? (
                <LoadingState title="Loading dashboard…" />
            ) : (
                data && (
                    <>
                        <div className={styles.grid}>
                            <section className={styles.panel}>
                                <p className={content.summary}>{data.studentCount || 0}</p>
                                <p>Registered students</p>
                            </section>
                            <section className={styles.panel}>
                                <p className={content.summary}>
                                    {countVerified(data.course?.children)}
                                </p>
                                <p>Verified files</p>
                            </section>
                        </div>
                        <section className={`${styles.panel} ${styles.stack}`}>
                            <h2 className={styles.heading}>Course structure</h2>
                            {data.course?.children?.length ? (
                                data.course.children.map((node) => (
                                    <ContentTree
                                        key={node._id}
                                        node={node}
                                        canManage={data.course.capabilities?.canManage}
                                        onAction={setTarget}
                                    />
                                ))
                            ) : (
                                <EmptyState title="No folders or files yet">
                                    <p>Course content will appear here once added.</p>
                                </EmptyState>
                            )}
                        </section>
                        <section className={styles.panel}>
                            <h2 className={styles.heading}>Pending contributions</h2>
                            <ModerationList
                                code={code}
                                items={data.contributions?.filter((item) => !item.approved) || []}
                                canModerate={data.course?.capabilities?.canModerate}
                                onAction={setTarget}
                            />
                        </section>
                    </>
                )
            )}
            {target && (
                <ContentActionDialog
                    target={target}
                    code={code}
                    onClose={() => setTarget(null)}
                    onAccepted={accepted}
                />
            )}
        </section>
    );
}
