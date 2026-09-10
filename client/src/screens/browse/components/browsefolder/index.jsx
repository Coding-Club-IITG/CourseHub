import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Badge } from "@coursehub/ui";
import { deleteFolder, renameFolder } from "../../../../api/Folder";
import { ResourceConfirmation, InlineRename } from "../../../../components/content-dialogs";
import { getSubtreeFileCount } from "../../../../utils/folderUtils";
import styles from "./styles.module.scss";
export default function BrowseFolder({ name, subject, folderData }) {
    const navigate = useNavigate();
    const [editing, setEditing] = useState(false),
        [deleting, setDeleting] = useState(false),
        [busy, setBusy] = useState(false),
        [error, setError] = useState("");
    const courseCode = subject || folderData.courses?.[0];
    const canManage = folderData.capabilities?.canManage === true;
    const count = getSubtreeFileCount(folderData);
    const remove = async () => {
        if (busy) return;
        setBusy(true);
        setError("");
        try {
            await deleteFolder({ folderId: folderData._id, courseCode });
            setDeleting(false);
        } catch (failure) {
            setError(failure.message || "Failed to delete folder.");
        } finally {
            setBusy(false);
        }
    };
    return (
        <article className={`${styles.folder} browse-folder`}>
            <button
                type="button"
                className={styles.open}
                onClick={() => navigate(`/browse/${courseCode}/${folderData._id}`)}
            >
                <span className="name">{name || "Untitled folder"}</span>
                <span className={styles.count}>
                    {count === 0 ? "Empty" : `${count} ${count === 1 ? "file" : "files"}`}
                </span>
            </button>
            {folderData.affectedCourses?.length > 1 && <Badge tone="info">Shared folder</Badge>}
            {canManage && (
                <div className={styles.actions}>
                    <Button className="rename-tick" variant="link" onClick={() => setEditing(true)}>
                        Rename
                    </Button>
                    <Button
                        className="delete"
                        title="Delete folder"
                        variant="link"
                        onClick={() => {
                            setError("");
                            setDeleting(true);
                        }}
                    >
                        {folderData.affectedCourses?.length > 1 ? "Remove" : "Delete"}
                    </Button>
                </div>
            )}
            {editing && (
                <InlineRename
                    resource="folder"
                    initialName={name}
                    affectedCourses={folderData.affectedCourses}
                    onCancel={() => setEditing(false)}
                    onSave={(value) => renameFolder(folderData._id, value, courseCode)}
                />
            )}
            <ResourceConfirmation
                resource="folder"
                isOpen={deleting}
                affectedCourses={folderData.affectedCourses}
                courseCode={courseCode}
                onConfirm={remove}
                onCancel={() => setDeleting(false)}
                isLoading={busy}
                error={error}
            />
        </article>
    );
}
