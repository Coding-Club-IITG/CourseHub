import { useState } from "react";
import { Link } from "react-router-dom";
import { ConfirmDialog } from "@coursehub/ui";
import { deleteNode, handleContribution } from "../../apis/courses";
import styles from "../../styles/layout.module.scss";
export default function ContentActionDialog({ target, code, onClose, onAccepted }) {
    const [busy, setBusy] = useState(false),
        [error, setError] = useState(null);
    const affected = target.affectedCourses.length ? target.affectedCourses : [code],
        shared = affected.length > 1,
        approve = target.action === "approve",
        unlink = shared && target.type === "folder";
    const label = approve
        ? "Approve"
        : target.action === "reject"
          ? "Reject"
          : unlink
            ? "Unlink"
            : "Delete";
    const confirm = async () => {
        setBusy(true);
        setError(null);
        try {
            const result =
                target.type === "contribution"
                    ? await handleContribution(target.id, target.action, code, affected)
                    : await deleteNode(target.type, target.id, code, affected);
            onAccepted(
                result,
                approve
                    ? "Contribution approved."
                    : unlink
                      ? "Folder unlink completed."
                      : "Cleanup completed.",
            );
            onClose();
        } catch (failure) {
            setError(failure);
        } finally {
            setBusy(false);
        }
    };
    return (
        <ConfirmDialog
            open
            onOpenChange={(value) => !value && onClose()}
            title={`${label} ${target.name}?`}
            description={
                approve
                    ? "Approved files become available to signed-in students."
                    : unlink
                      ? `This folder will be unlinked from ${code}. Other linked courses keep its contents.`
                      : "These files will be permanently removed. This cannot be undone."
            }
            confirmLabel={label}
            danger={!approve}
            busy={busy}
            error={error}
            onConfirm={confirm}
        >
            <div className={styles.stack}>
                {shared && (
                    <p className={styles.warning}>
                        {unlink ? "Linked courses" : "Affected courses"}: {affected.join(", ")}.{" "}
                        {!unlink &&
                            !approve &&
                            "Shared files are deleted from every affected course."}
                    </p>
                )}
                {!approve && (
                    <p>
                        Cleanup continues on the server after it is scheduled. Follow its progress
                        in{" "}
                        <Link className={styles.link} to="/admin/operations">
                            Operations
                        </Link>
                        .
                    </p>
                )}
            </div>
        </ConfirmDialog>
    );
}
