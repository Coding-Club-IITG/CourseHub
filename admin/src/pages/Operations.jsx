import { useQuery } from "@coursehub/browser";
import { Button, FormField, LoadingState, ErrorState, EmptyState } from "@coursehub/ui";
import { library, session } from "../session";
import { listOperations } from "../apis/operations";
import { activeOperation, useOperation } from "../queries/useOperation";
import { useWorkflowLocation } from "../queries/useWorkflowLocation";
import OperationCard from "../components/operations/OperationCard";
import styles from "../styles/layout.module.scss";
const statuses = [
    "failed",
    "partial",
    "queued",
    "running",
    "awaiting",
    "completed",
    "cancelling",
    "cancelled",
];
export default function Operations() {
    const { params, update } = useWorkflowLocation(),
        raw = Number(params.get("page")),
        page = Number.isInteger(raw) && raw > 0 && raw <= 10000 ? raw : 1,
        status = statuses.includes(params.get("status")) ? params.get("status") : "";
    const selected = useOperation(params.get("operation"));
    const query = useQuery({
        queryKey: [...library.key("operations"), { page, status }],
        queryFn: ({ signal }) => listOperations(page, status, signal),
        retry: false,
        refetchInterval: (q) => (q.state.data?.items.some(activeOperation) ? 1000 : false),
    });
    const refresh = () => {
        query.refetch();
        if (params.get("operation")) selected.refetch();
    };
    const retried = (item) => {
        update({ operation: item.id });
        session.queryClient.setQueryData([...library.key("operation"), { id: item.id }], item);
        query.refetch();
    };
    return (
        <section className={styles.page}>
            <header className={styles.pageHeader}>
                <div>
                    <h1 className={styles.heading}>Operations</h1>
                    <p className={styles.muted}>
                        Uploads, linking, course refreshes, imports and recoverable content cleanup.
                    </p>
                </div>
            </header>
            <div className={`${styles.toolbar} ${styles.alignEnd}`}>
                <FormField label="Status">
                    <select
                        value={status}
                        onChange={(event) =>
                            update({ status: event.target.value, page: undefined })
                        }
                    >
                        <option value="">All statuses</option>
                        {statuses.map((value) => (
                            <option key={value}>{value}</option>
                        ))}
                    </select>
                </FormField>
                <Button
                    variant="secondary"
                    onClick={refresh}
                    busy={query.isFetching}
                    busyLabel="Refreshing…"
                >
                    Refresh
                </Button>
            </div>
            {(query.error || selected.error) && (
                <ErrorState
                    title="Could not update operation status"
                    error={query.error || selected.error}
                />
            )}
            {query.isPending && <LoadingState title="Loading operations…" />}
            {params.get("operation") && (
                <section className={styles.stack} aria-label="Selected operation">
                    <div className={styles.toolbar}>
                        <h2 className={styles.heading}>Selected operation</h2>
                        <Button variant="ghost" onClick={() => update({ operation: undefined })}>
                            Dismiss selection
                        </Button>
                    </div>
                    {selected.isPending ? (
                        <LoadingState title="Loading selected operation…" />
                    ) : (
                        selected.data && (
                            <OperationCard
                                key={selected.data.id}
                                item={selected.data}
                                onRetried={retried}
                            />
                        )
                    )}
                </section>
            )}
            {query.data?.items.length === 0 && !selected.data && (
                <EmptyState title="No operations match this status" />
            )}
            <div className={styles.stack}>
                {query.data?.items
                    .filter((item) => item.id !== selected.data?.id)
                    .map((item) => (
                        <OperationCard key={item.id} item={item} onRetried={retried} />
                    ))}
            </div>
            {query.data && query.data.total > 20 && (
                <nav aria-label="Operation pages" className={styles.toolbar}>
                    <Button
                        variant="secondary"
                        disabled={page === 1 || query.isFetching}
                        onClick={() => update({ page: page - 1 })}
                    >
                        Previous
                    </Button>
                    <span>
                        Page {page} of {Math.ceil(query.data.total / 20)}
                    </span>
                    <Button
                        variant="secondary"
                        disabled={page * 20 >= query.data.total || query.isFetching}
                        onClick={() => update({ page: page + 1 })}
                    >
                        Next
                    </Button>
                </nav>
            )}
        </section>
    );
}
