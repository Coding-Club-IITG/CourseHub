import "./styles.scss";
import React, { useState } from "react";
import { formatFileName, formatFileSize, formatFileType } from "../../../../utils/formatFile";
import { toast } from "react-toastify";
import { useDispatch, useSelector } from "react-redux";
import { ChangeFolder } from "../../../../actions/filebrowser_actions.js";
import clientRoot from "../../../../api/server";
import capitalise from "../../../../utils/capitalise.js";
import Share from "../../../share";
import API_BASE_URL from "../../../../api/server";
import { verifyFile, unverifyFile, renameFile } from "../../../../api/File";
import {
    RemoveFileFromFolder,
    UpdateFileVerificationStatus,
} from "../../../../actions/filebrowser_actions.js";
import ConfirmDialog from "./components/ConfirmDialog.jsx";
import FileRename from "./components/FileRename.jsx";
import { getFileDownloadLink } from "../../../../api/File";

const FileDisplay = ({ file, path, code, isMobileView = false, index = 0 }) => {

    const fileSize = formatFileSize(file.size);
    const fileType = formatFileType(file.name);
    const [showDialog, setShowDialog] = useState(false);
    const [dialogType, setDialogType] = useState("verify");
    const [onConfirmAction, setOnConfirmAction] = useState(() => () => { });
    const [isProcessing, setIsProcessing] = useState(false);

    let name = file.name;
    let _dispName = formatFileName(name);
    let contributor = file.name;
    let untruncatedDispName = name;
    try {
        const lastTildeIndex = name.lastIndexOf("~");
        if (lastTildeIndex !== -1) {
            untruncatedDispName = name.slice(0, lastTildeIndex);
            _dispName = formatFileName(untruncatedDispName);
            let contributorPart = name.slice(lastTildeIndex + 1);
            const dotIdx = contributorPart.indexOf(".");
            contributor = dotIdx !== -1 ? contributorPart.slice(0, dotIdx) : contributorPart;
        } else {
            const dotIdx = name.lastIndexOf(".");
            untruncatedDispName = dotIdx !== -1 ? name.slice(0, dotIdx) : name;
            _dispName = formatFileName(untruncatedDispName);
            contributor = "Anonymous";
        }
    } catch (error) {
        _dispName = formatFileName(file.name);
        untruncatedDispName = file.name;
        contributor = "Anonymous";
    }
    const isLoggedIn = useSelector((state) => state.user?.loggedIn);
    const currCourseCode = useSelector((state) => state.fileBrowser?.currentCourseCode);
    const currFolderId = useSelector((state) => state.fileBrowser?.currentFolder?._id);
    const canManage = file.capabilities?.canManage === true;

    const currentFolder = useSelector((state) => state.fileBrowser?.currentFolder);
    const [isEditing, setIsEditing] = useState(false);
    const dispatch = useDispatch();


    const thumbnailUrl =
        file.thumbnail?.url ? new URL(file.thumbnail.url, API_BASE_URL).href : undefined;

    const handleRename = async (newName) => {
        const trimmed = newName?.trim();
        if (!trimmed || trimmed === untruncatedDispName) return;

        // Validation for illegal OneDrive characters: \ / : * ? " < > |
        const illegalChars = /[\\/:*?"<>|]/;
        if (illegalChars.test(trimmed)) {
            toast.error("Filename cannot contain any of the following characters: \\ / : * ? \" < > |");
            return;
        }

        if (trimmed.length > 200) {
            toast.error("Filename is too long (maximum 200 characters).");
            return;
        }

        try {
            const responseData = await renameFile(file._id, trimmed, currCourseCode);
            toast.success("File renamed successfully!");
            dispatch(
                ChangeFolder({
                    ...currentFolder,
                    children: (currentFolder?.children || []).map((child) =>
                        child._id === file._id ? { ...child, name: responseData.file.name } : child
                    ),
                })
            );
        } catch (err) {
            console.error("Error renaming file:", err);
            toast.error(err.response?.data?.message || "Failed to rename file");
        }
    };

    const handleDownload = async () => {
        if (!isLoggedIn) {
            toast.error("Please login to download.");
            return;
        }

        const downloadLink = await getFileDownloadLink(file._id, currCourseCode);

        if (!downloadLink) {
            toast.error("Failed to generate download link.");
            return;
        }

        const a = document.createElement("a");
        a.href = downloadLink;
        a.download = file.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        toast.success("Downloading file...");
    };

    const handlePreview = async () => {
        if (!isLoggedIn) {
            toast.error("Please login to preview file.");
            return;
        }

        window.open(`${API_BASE_URL}/api/files/preview/${file._id}`, "_blank", "noopener");
    };


    const handleVerify = async () => {
        setDialogType("verify");
        setOnConfirmAction(() => async () => {
            if (isProcessing) return;

            try {
                setIsProcessing(true);
                await verifyFile(file._id, currCourseCode);
                toast.success("File verified!");
                dispatch(UpdateFileVerificationStatus(file._id, true));
            } catch (err) {
                console.error("Error verifying:", err);
                toast.error("Failed to verify file.");
            } finally {
                setIsProcessing(false);
                setShowDialog(false);
            }
        });
        setShowDialog(true);
    };

    const handleUnverify = () => {
        setDialogType("delete");
        setOnConfirmAction(() => async () => {
            if (isProcessing) return;

            try {
                setIsProcessing(true);
                await unverifyFile(file._id, currCourseCode);
                toast.success("File deleted!");
                dispatch(RemoveFileFromFolder(file._id));
            } catch (err) {
                console.error("Error deleting:", err);
                toast.error("Failed to delete file.");
            } finally {
                setIsProcessing(false);
                setShowDialog(false);
            }
        });
        setShowDialog(true);
    };

    return (
        <div
            className={`file-display ${!file.isVerified || canManage ? (file.isVerified ? "verified" : "unverified") : ""
                }`}
            style={{ animationDelay: `${Math.min(index * 30, 150)}ms` }}
        >
            <div
                className="img-preview"
                style={{
                    background: `url(${thumbnailUrl}) center/cover no-repeat`,
                }}
            >
                <div className="top">
                    {!isMobileView && canManage && (
                        <>
                            {!file.isVerified ? (
                                <span className="verify" onClick={handleVerify} title="Verify"></span>
                            ) : (
                                <></>
                            )}
                            <span className="unverify" onClick={handleUnverify} title="Delete"></span>
                        </>
                    )}

                    <span className="download" onClick={handleDownload}></span>
                </div>
                <div className="view" onClick={handlePreview} title={file.name}>
                    View
                </div>
            </div>
            <div className="content">
                {isEditing ? (
                    <FileRename
                        affectedCourses={file.affectedCourses}
                        initialName={untruncatedDispName}
                        onCancel={() => setIsEditing(false)}
                        onSave={(newName) => {
                            handleRename(newName);
                            setIsEditing(false);
                        }}
                    />
                ) : (
                    <p className="title" title={file.name}>
                        {file?.name ? _dispName : "Quiz 1 Answer Key"}
                        {!isMobileView && canManage && (
                            <span
                                className="rename-tick"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsEditing(true);
                                }}
                                title="Rename"
                            ></span>
                        )}
                    </p>
                )}
                <div className="file-metadata">
                    <p className="info">
                        {fileType.toUpperCase()} {fileSize}
                    </p>
                    {!file.isVerified && <p className="info">Pending approval</p>}
                    <p className="contributor">{capitalise(contributor)}</p>
                </div>
            </div>
            <Share link={`${clientRoot}/browse/${currCourseCode.toLowerCase()}/${currFolderId}`} />
            {!isMobileView && (
                <ConfirmDialog
                    affectedCourses={file.affectedCourses}
                    isOpen={showDialog}
                    type={dialogType}
                    onConfirm={onConfirmAction}
                    onCancel={() => setShowDialog(false)}
                    isLoading={isProcessing}
                />
            )}
        </div>
    );
};

export default FileDisplay;
