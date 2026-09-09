import { useCourseBrowser } from "../../../../queries/browserContext";
import "./styles.scss";
import { useState, useRef, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useShare } from "../../../share/context";
import { resourceLink } from "../../../../utils/resourceLink";
import { useFavourite } from "../../../../queries/favourites";
import { useFileActions } from "../../../../components/file-actions/useFileActions";
import FileThumbnail from "../../../../components/file-actions/FileThumbnail";
import { formatFileName, formatFileSize, formatFileType } from "../../../../utils/formatFile";
import { toast } from "react-toastify";

import capitalise from "../../../../utils/capitalise.js";
import { verifyFile, unverifyFile, renameFile } from "../../../../api/File";

import ConfirmDialog from "./components/ConfirmDialog.jsx";
import FileRename from "./components/FileRename.jsx";

const FileDisplay = ({ file, courseCode, folderId, isMobileView = false, index = 0 }) => {
    const fileSize = formatFileSize(file.sizeBytes ?? file.size);
    const fileType = formatFileType(file.name);
    const [showDialog, setShowDialog] = useState(false);
    const [dialogType, setDialogType] = useState("verify");
    const [onConfirmAction, setOnConfirmAction] = useState(() => () => {});
    const [isProcessing, setIsProcessing] = useState(false);

    let name = file.name;
    let _dispName = formatFileName(name);
    let contributor = file.name;
    let untruncatedDispName = name;
    try {
        const lastTildeIndex = name.lastIndexOf("~");
        if (lastTildeIndex !== -1 && !file.contributorName) {
            untruncatedDispName = name.slice(0, lastTildeIndex);
            _dispName = formatFileName(untruncatedDispName);
            let contributorPart = name.slice(lastTildeIndex + 1);
            const dotIdx = contributorPart.indexOf(".");
            contributor = dotIdx !== -1 ? contributorPart.slice(0, dotIdx) : contributorPart;
        } else {
            const dotIdx = name.lastIndexOf(".");
            untruncatedDispName = dotIdx !== -1 ? name.slice(0, dotIdx) : name;
            _dispName = formatFileName(untruncatedDispName);
            contributor = file.contributorName || "Anonymous";
        }
    } catch {
        _dispName = formatFileName(file.name);
        untruncatedDispName = file.name;
        contributor = "Anonymous";
    }
    const browser = useCourseBrowser();
    const currCourseCode = courseCode || browser.currentCourseCode;
    const currFolderId = folderId || browser.currentFolder?._id;
    const share = useShare();
    useEffect(
        () => () => share((current) => (current?.fileId === file._id ? null : current)),
        [share, file._id],
    );
    const { favourite, saving, toggle } = useFavourite(file._id, currCourseCode);
    const { preview, download, busy } = useFileActions(file, currCourseCode);
    const [params, setParams] = useSearchParams();
    const selected = params.get("file") === file._id;
    const card = useRef(null);
    useEffect(() => {
        if (selected) {
            card.current?.focus({ preventScroll: true });
            card.current?.scrollIntoView({ block: "center" });
        }
    }, [selected]);
    const canManage = file.capabilities?.canManage === true;

    const [isEditing, setIsEditing] = useState(false);

    const handleRename = async (newName) => {
        const trimmed = newName?.trim();
        if (!trimmed || trimmed === untruncatedDispName) return;

        // Validation for illegal OneDrive characters: \ / : * ? " < > |
        const illegalChars = /[\\/:*?"<>|]/;
        if (illegalChars.test(trimmed)) {
            toast.error(
                'Filename cannot contain any of the following characters: \\ / : * ? " < > |',
            );
            return;
        }

        if (trimmed.length > 200) {
            toast.error("Filename is too long (maximum 200 characters).");
            return;
        }

        try {
            await renameFile(file._id, trimmed, currCourseCode);
            toast.success("File renamed successfully!");
        } catch (err) {
            console.error("Error renaming file:", err);
            toast.error(err.message || "Failed to rename file");
        }
    };

    const handleVerify = async () => {
        setDialogType("verify");
        setOnConfirmAction(() => async () => {
            if (isProcessing) return;

            try {
                setIsProcessing(true);
                await verifyFile(file._id, currCourseCode);
                toast.success("File verified!");
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
                await unverifyFile(file._id, currCourseCode, file.affectedCourses);
                toast.success("File deleted!");
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
            ref={card}
            tabIndex={selected ? 0 : -1}
            aria-label={selected ? `Selected file: ${file.name}` : undefined}
            className={`file-display ${selected ? "selected" : ""} ${
                !file.isVerified || canManage ? (file.isVerified ? "verified" : "unverified") : ""
            }`}
            style={{ animationDelay: `${Math.min(index * 30, 150)}ms` }}
        >
            <div className="img-preview">
                <FileThumbnail file={file} />
                {selected && (
                    <button
                        type="button"
                        className="selected-file-label"
                        aria-label="Clear selection"
                        onClick={() => {
                            const next = new URLSearchParams(params);
                            next.delete("file");
                            setParams(next, { replace: true });
                        }}
                    >
                        Selected <span aria-hidden="true">×</span>
                    </button>
                )}
                <div className="top">
                    {!isMobileView && canManage && (
                        <>
                            {!file.isVerified ? (
                                <span
                                    className="verify"
                                    onClick={handleVerify}
                                    title="Verify"
                                ></span>
                            ) : (
                                <></>
                            )}
                            <span
                                className="unverify"
                                onClick={handleUnverify}
                                title="Delete"
                            ></span>
                        </>
                    )}
                </div>
                <button
                    type="button"
                    className="view"
                    onClick={preview}
                    disabled={!!busy}
                    title={file.name}
                    aria-label={`Preview ${file.name}`}
                >
                    {busy === "preview" ? "Opening…" : "View"}
                </button>
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
            <div className="file-actions">
                <button
                    type="button"
                    className="star"
                    aria-label={favourite ? "Remove from favourites" : "Add to favourites"}
                    title={favourite ? "Remove from favourites" : "Add to favourites"}
                    aria-pressed={!!favourite}
                    disabled={saving}
                    onClick={toggle}
                />
                <button
                    type="button"
                    className="share"
                    aria-label="Share file"
                    title="Share file"
                    onClick={() =>
                        share({
                            fileId: file._id,
                            name: file.name,
                            pending: !file.isVerified,
                            link: resourceLink(currCourseCode, currFolderId, file._id),
                        })
                    }
                />
                <button
                    type="button"
                    className="download"
                    aria-label={busy === "download" ? "Downloading file" : "Download file"}
                    title="Download file"
                    disabled={!!busy}
                    onClick={download}
                />
            </div>
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
