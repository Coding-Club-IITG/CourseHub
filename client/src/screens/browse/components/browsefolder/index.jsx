import "./styles.scss";
import React, { useState } from "react";
import { useSelector } from "react-redux";
import { useDispatch } from "react-redux";
import { ChangeFolder, PushFolderHistory } from "../../../../actions/filebrowser_actions";
import { deleteFolder, renameFolder } from "../../../../api/Folder";
import { toast } from "react-toastify";
import { ConfirmDialog } from "./confirmDialog";
import { FolderRename } from "./folderRename.jsx";
import { getSubtreeFileCount } from "../../../../utils/folderUtils";

const BrowseFolder = ({
    name,
    subject,
    folderData,
    parentFolder,
    isMobileView = false,
}) => {
    const dispatch = useDispatch();
    const currentFolder = useSelector((state) => state.fileBrowser.currentFolder);
    const isBR = useSelector((state) => state.user.user.isBR);
    const [showConfirm, setShowConfirm] = useState(false);
    const user = useSelector((state) => state.user.user);
    const courseCode = subject || (folderData?.courses ? folderData.courses[0] : folderData?.course);
    const fileCount = getSubtreeFileCount(folderData);
    const isReadOnlyCourse =
        user?.readOnly?.some((c) => c.code.toLowerCase() === courseCode?.toLowerCase()) &&
        !user?.courses?.some((c) => c.code.toLowerCase() === courseCode?.toLowerCase()) &&
        !(
            user?.isBR &&
            user?.previousCourses?.some((sem) =>
                sem.courses.some((c) => c.code.toLowerCase() === courseCode?.toLowerCase())
            )
        );

    const [isEditing, setIsEditing] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const setFolderName = async (newName) => {
        try {
            const renamedFolder = await renameFolder(folderData._id, newName);
            toast.success("Folder renamed successfully!");
            dispatch(
                ChangeFolder({
                    ...currentFolder,
                    children: (currentFolder?.children || []).map((child) =>
                        child._id === folderData._id ? { ...child, name: renamedFolder.name } : child
                    ),
                })
            );
        } catch (err) {
            toast.error("Failed to rename folder");
        }
    };

    const onClick = (folderData) => {
        if (currentFolder) {
            dispatch(PushFolderHistory(currentFolder));
        }
        dispatch(ChangeFolder(folderData));
    };

    const handleDelete = async (e) => {
        if (isDeleting) return;
        try {
            setIsDeleting(true);
            await deleteFolder({ folder: folderData, parentFolderId: parentFolder._id, courseCode });
            toast.success("Folder deleted successfully!");
            dispatch(
                ChangeFolder({
                    ...currentFolder,
                    children: (currentFolder?.children || []).filter(
                        (child) => child._id !== folderData._id
                    ),
                })
            );
            setShowConfirm(false);
        } catch (err) {
            toast.error("Failed to delete folder.");
        } finally {
            setIsDeleting(false);
        }
    };

    const cancelDelete = () => {
        if (isDeleting) return;
        setShowConfirm(false);
    };

    return (
        <>
            <div className="browse-folder" onClick={() => onClick(folderData)}>
                <div className="content">
                    <div className="top">
                        <p className="path">{""}</p>
                        {!isEditing ? (
                            <div className="name-container">
                                <span className="name">
                                    {name ? name : "Name"}
                                    {!isMobileView && isBR && !isReadOnlyCourse && (
                                        <div
                                            className="rename-tick"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setIsEditing(true);
                                            }}
                                        ></div>
                                    )}
                                </span>
                                <span className="file-count" title={`${fileCount} files in subtree`}>
                                    {fileCount === 0 ? "EMPTY" : `${fileCount} ${fileCount === 1 ? "FILE" : "FILES"}`}
                                </span>
                            </div>
                        ) : (
                            <FolderRename
                                initialName={name}
                                onCancel={() => setIsEditing(false)}
                                onSave={(newName) => {
                                    setFolderName(newName);
                                    setIsEditing(false);
                                }}
                            />
                        )}
                        {!isMobileView && isBR && !isReadOnlyCourse && (
                            <span
                                className="delete"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShowConfirm(true);
                                }}
                                title="Delete folder"
                            ></span>
                        )}
                    </div>
                    <div className="bottom">
                        <p className="subject">
                            {subject ? subject.toUpperCase() : "Subject Here"}
                        </p>
                    </div>
                </div>
            </div>
            {!isMobileView && isBR && !isReadOnlyCourse && (
                <ConfirmDialog
                    isOpen={showConfirm}
                    type="delete"
                    onConfirm={handleDelete}
                    onCancel={cancelDelete}
                    isLoading={isDeleting}
                />
            )}
        </>
    );
};

export default BrowseFolder;
