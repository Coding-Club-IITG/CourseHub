import { Button, Badge, EmptyState } from "@coursehub/ui";
import styles from "./styles.module.scss";
import layout from "../../styles/layout.module.scss";
export default function ModerationList({ items, canModerate, onAction, code }) {
    if (!items.length)
        return (
            <EmptyState title="You're all caught up">
                <p>New submissions will show up here for review.</p>
            </EmptyState>
        );
    return items.map((item) => (
        <article key={item.contributionId} className={styles.submission}>
            <div>
                <Badge tone="warning">Awaiting review</Badge>
            </div>
            <ul className={styles.files}>
                {item.files?.map((file, index) => (
                    <li key={file._id || index}>
                        {file.name}
                        {file.affectedCourses?.length > 1 && (
                            <p className={layout.small}>
                                Shared with {file.affectedCourses.join(", ")}
                            </p>
                        )}
                    </li>
                ))}
            </ul>
            {canModerate && (
                <div className={layout.toolbar}>
                    {["approve", "reject"].map((action) => (
                        <Button
                            key={action}
                            variant={action === "approve" ? "primary" : "secondary"}
                            onClick={() =>
                                onAction({
                                    action,
                                    type: "contribution",
                                    id: item.contributionId,
                                    name: "this contribution",
                                    affectedCourses: [
                                        ...new Set(
                                            item.files?.flatMap(
                                                (file) => file.affectedCourses || [code],
                                            ) || [code],
                                        ),
                                    ].sort(),
                                })
                            }
                        >
                            {action === "approve" ? "Approve" : "Reject"}
                        </Button>
                    ))}
                </div>
            )}
        </article>
    ));
}
