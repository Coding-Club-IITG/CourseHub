import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Card, IconButton, Icon } from "@coursehub/ui";
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
        <Card as="article" className={`${styles.folder} browse-folder`}>
            <div className={styles.heading} hidden={editing}>
                <Button
                    hidden={editing}
                    type="button"
                    className={styles.open}
                    variant="ghost"
                    onClick={() => navigate(`/browse/${courseCode}/${folderData._id}`)}
                >
                    <span className="name">{name || "Untitled folder"}</span>
                </Button>
                {canManage && (
                    <IconButton
                        size="sm"
                        label="Rename"
                        className={`${styles.renameTrigger} rename-tick`}
                        variant="ghost"
                        onClick={() => setEditing(true)}
                    >
                        <Icon name="edit" />
                    </IconButton>
                )}
            </div>
            {editing && (
                <InlineRename
                    resource="folder"
                    initialName={name}
                    affectedCourses={folderData.affectedCourses}
                    onCancel={() => setEditing(false)}
                    onSave={(value) => renameFolder(folderData._id, value, courseCode)}
                />
            )}
            <span className={styles.count}>
                {count === 0 ? "EMPTY" : `${count} ${count === 1 ? "FILE" : "FILES"}`}
            </span>
            <div className={styles.footer}>
                {canManage && (
                    <IconButton
                        size="sm"
                        label={folderData.affectedCourses?.length > 1 ? "Remove" : "Delete"}
                        className={`${styles.deleteTrigger} delete`}
                        hidden={editing}
                        title="Delete folder"
                        variant="ghost"
                        onClick={() => {
                            setError("");
                            setDeleting(true);
                        }}
                    >
                        <Icon name="trash" />
                    </IconButton>
                )}
                <span className={styles.subject}>{courseCode}</span>
            </div>
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
        </Card>
    );
}
