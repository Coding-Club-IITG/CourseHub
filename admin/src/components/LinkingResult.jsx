import styles from "@/styles/layout.module.scss";
export default function LinkingResult({ result, completed = true }) {
    if (!result) return null;
    return (
        <div
            className={[styles.stack, styles.small, styles.wrap, styles.grow, styles.spaced].join(
                " ",
            )}
        >
            <p className={styles.text}>
                {result.sourceCode} → {result.targetCode}
            </p>
            <p>
                {completed ? "Linked" : "Planned"}: {result.linked.length}{" "}
                {result.linked.length === 1 ? "year" : "years"}. Already linked:{" "}
                {result.alreadyLinked.length}. Empty replacements: {result.replaced.length}.
            </p>
            {result.conflicts.length > 0 && (
                <div className={styles.warning} role="status">
                    <p className={styles.text}>
                        {result.conflicts.length} year{" "}
                        {result.conflicts.length === 1 ? "conflict" : "conflicts"} - content
                        preserved
                    </p>
                    <ul className={[styles.stack, styles.spaced].join(" ")}>
                        {result.conflicts.map((conflict, index) => (
                            <li key={index}>
                                <strong>{conflict.year}</strong>: {conflict.reason}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}
