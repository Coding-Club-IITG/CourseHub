import { Button, FormField } from "@coursehub/ui";
import styles from "@/styles/layout.module.scss";
export default function Pagination({ page, pageSize, total, loading, onPage, onPageSize }) {
    const pages = Math.max(1, Math.ceil(total / pageSize));
    return (
        <nav className={styles.pagination} aria-label="Pagination">
            <p aria-live="polite">
                {loading ? "Loading page…" : `${total} results · Page ${page} of ${pages}`}
            </p>
            <div className={styles.toolbar}>
                <Button variant="secondary" onClick={() => onPage(page - 1)} disabled={page <= 1}>
                    Previous
                </Button>
                <Button
                    variant="secondary"
                    onClick={() => onPage(page + 1)}
                    disabled={loading || page >= pages}
                >
                    Next
                </Button>
                <FormField label="Rows per page">
                    <select
                        value={pageSize}
                        onChange={(event) => onPageSize(Number(event.target.value))}
                    >
                        {[10, 20, 50, 100].map((size) => (
                            <option key={size} value={size}>
                                {size}
                            </option>
                        ))}
                    </select>
                </FormField>
            </div>
        </nav>
    );
}
