import { useState } from "react";
import { Button, Badge } from "@coursehub/ui";
import { verifyFile, unverifyFile } from "../../../../../api/File";
import { useFileActions } from "../../../../../components/file-actions/useFileActions";
import { ResourceConfirmation } from "../../../../../components/content-dialogs";
import styles from "./styles.module.scss";
export default function ContributionCard({
    file,
    courseCode,
    managementCourseCode,
    uploadDate,
    onChanged,
}) {
    const [action, setAction] = useState(null),
        [busy, setBusy] = useState(false),
        [error, setError] = useState("");
    const context = managementCourseCode || courseCode;
    const { preview, busy: opening } = useFileActions(file, context);
    const confirm = async () => {
        if (busy) return;
        setBusy(true);
        setError("");
        try {
            if (action === "verify") await verifyFile(file._id, context);
            else await unverifyFile(file._id, context, file.affectedCourses);
            setAction(null);
            await onChanged();
        } catch (failure) {
            setError(failure.message || "The action could not finish. Please retry.");
        } finally {
            setBusy(false);
        }
    };
    const date = new Date(uploadDate),
        validDate = Number.isFinite(date.getTime());
    return (
        <article className={`${styles.card} main_card`}>
            <div className={styles.details}>
                <strong>{courseCode}</strong>
                {validDate && (
                    <time dateTime={date.toISOString()}>
                        {date.toLocaleString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                        })}
                    </time>
                )}
            </div>
            <Button
                variant="link"
                className={styles.name}
                onClick={preview}
                busy={!!opening}
                busyLabel="Opening…"
            >
                {file.name}
            </Button>
            <div className={styles.actions}>
                <Badge tone={file.isVerified ? "success" : "warning"}>
                    {file.isVerified ? "Approved" : "Pending"}
                </Badge>
                {file.capabilities?.canManage && (
                    <>
                        {!file.isVerified && (
                            <Button
                                onClick={() => {
                                    setError("");
                                    setAction("verify");
                                }}
                            >
                                Approve
                            </Button>
                        )}
                        <Button
                            variant="secondary"
                            onClick={() => {
                                setError("");
                                setAction("delete");
                            }}
                        >
                            Delete
                        </Button>
                    </>
                )}
            </div>
            <ResourceConfirmation
                affectedCourses={file.affectedCourses}
                isOpen={!!action}
                type={action || "verify"}
                onConfirm={confirm}
                onCancel={() => setAction(null)}
                isLoading={busy}
                error={error}
            />
        </article>
    );
}
