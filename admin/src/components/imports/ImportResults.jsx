import { Badge } from "@coursehub/ui";
import styles from "./styles.module.scss";
const tone = (state) =>
    ["failed", "conflict"].includes(state)
        ? "danger"
        : ["created", "updated"].includes(state)
          ? "success"
          : "neutral";
export default function ImportResults({ rows, counts, total, finished, preview = false }) {
    return (
        <div className={styles.results}>
            {counts && (
                <>
                    <p role="status">
                        Created {counts.created} · Updated {counts.updated} · Skipped{" "}
                        {counts.skipped} · Failed {counts.failed}
                    </p>
                    <progress value={finished} max={total || 1} aria-label="Import progress" />
                    <p>
                        {finished} of {total} rows finished
                    </p>
                </>
            )}
            <ul
                tabIndex={0}
                className={styles.rows}
                aria-label={preview ? "Import preview" : "Import results"}
            >
                {rows.map((row, index) => (
                    <li key={index}>
                        <div className={styles.rowHeader}>
                            <strong>{row.code || row.email}</strong>
                            <Badge tone={tone(row.state || row.action)}>
                                {row.state || row.action}
                            </Badge>
                        </div>
                        {row.name && <p className={styles.name}>{row.name}</p>}
                        {preview && row.previousName && row.previousName !== row.name && (
                            <p>Previously: {row.previousName}</p>
                        )}
                        <small>Row {row.row}</small>
                        {(row.error?.message || row.message) && (
                            <p
                                className={
                                    row.error || row.action === "conflict"
                                        ? styles.error
                                        : undefined
                                }
                            >
                                {row.error?.message || row.message}
                            </p>
                        )}
                    </li>
                ))}
            </ul>
        </div>
    );
}
