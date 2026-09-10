import triggerStyles from "../../../../components/content-dialogs/triggers.module.scss";
import { Button, Card, IconButton, Icon } from "@coursehub/ui";
import { useCourseBrowser } from "../../../../queries/browserContext";
import styles from "./styles.module.scss";
import { useState, useRef, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useShare } from "../../../share/context";
import { resourceLink } from "../../../../utils/resourceLink";
import { useFavourite } from "../../../../queries/favourites";
import { useFileActions } from "../../../../components/file-actions/useFileActions";
import FileThumbnail from "../../../../components/file-actions/FileThumbnail";
import { formatFileSize, formatFileType } from "../../../../utils/formatFile";
import { toast } from "../../../../notifications/toast";

import capitalise from "../../../../utils/capitalise.js";
import { verifyFile, unverifyFile, renameFile, getFilePreviewUrl } from "../../../../api/File";

import { ResourceConfirmation, InlineRename } from "../../../../components/content-dialogs";

const FileDisplay = ({ file, courseCode, folderId, index = 0 }) => {
    const fileSize = formatFileSize(file.sizeBytes ?? file.size);
    const fileType = formatFileType(file.name);
    const [showDialog, setShowDialog] = useState(false);
    const [dialogType, setDialogType] = useState("verify");
    const [actionError, setActionError] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);

    let name = file.name;
    let contributor = file.name;
    let untruncatedDispName = name;
    try {
        const lastTildeIndex = name.lastIndexOf("~");
        if (lastTildeIndex !== -1 && !file.contributorName) {
            untruncatedDispName = name.slice(0, lastTildeIndex);
            let contributorPart = name.slice(lastTildeIndex + 1);
            const dotIdx = contributorPart.indexOf(".");
            contributor = dotIdx !== -1 ? contributorPart.slice(0, dotIdx) : contributorPart;
        } else {
            const dotIdx = name.lastIndexOf(".");
            untruncatedDispName = dotIdx !== -1 ? name.slice(0, dotIdx) : name;
            contributor = file.contributorName || "Anonymous";
        }
    } catch {
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
    const { download, busy } = useFileActions(file, currCourseCode);
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
        if (newName === untruncatedDispName) return;
        if (/[\\/:*?"<>|]/.test(newName))
            throw new Error("Filename contains an unsupported character.");
        await renameFile(file._id, newName, currCourseCode);
        toast.success("File renamed successfully!");
    };
    const handleVerify = () => {
        setActionError("");
        setDialogType("verify");
        setShowDialog(true);
    };
    const handleUnverify = () => {
        setActionError("");
        setDialogType("delete");
        setShowDialog(true);
    };
    const onConfirmAction = async () => {
        if (isProcessing) return;
        setIsProcessing(true);
        setActionError("");
        try {
            if (dialogType === "verify") await verifyFile(file._id, currCourseCode);
            else await unverifyFile(file._id, currCourseCode, file.affectedCourses);
            setShowDialog(false);
            if (dialogType === "verify") toast.success("File verified!");
        } catch (error) {
            setActionError(error.message || "The action could not finish. Please retry.");
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <Card
            ref={card}
            tabIndex={selected ? 0 : -1}
            aria-label={selected ? `Selected file: ${file.name}` : undefined}
            className={`${styles.card} file-display ${selected ? "selected" : ""} ${
                !file.isVerified || canManage ? (file.isVerified ? "verified" : "unverified") : ""
            }`}
            style={{ animationDelay: `${Math.min(index * 30, 150)}ms` }}
        >
            <div className="img-preview">
                <FileThumbnail file={file} />
                {canManage && !file.isVerified && (
                    <IconButton
                        size="sm"
                        type="button"
                        className="verify"
                        variant="ghost"
                        label="Verify file"
                        title="Verify file"
                        onClick={handleVerify}
                    >
                        <Icon name="check" />
                    </IconButton>
                )}
                {selected && (
                    <Button
                        type="button"
                        className="selected-file-label"
                        variant="dark"
                        aria-label="Clear selection"
                        onClick={() => {
                            const next = new URLSearchParams(params);
                            next.delete("file");
                            setParams(next, { replace: true });
                        }}
                    >
                        Selected <span aria-hidden="true">×</span>
                    </Button>
                )}

                <a
                    className="view"
                    href={getFilePreviewUrl(file._id, currCourseCode)}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={file.name}
                    aria-label={`Preview ${file.name}`}
                >
                    <Icon name="eye" size={16} /> View
                </a>
            </div>
            <div className="content">
                {isEditing && (
                    <InlineRename
                        affectedCourses={file.affectedCourses}
                        initialName={untruncatedDispName}
                        onCancel={() => setIsEditing(false)}
                        onSave={handleRename}
                    />
                )}
                <div className="title" title={file.name} hidden={isEditing}>
                    <div className={`title-name ${canManage ? "can-rename" : ""}`}>
                        <p className="title-text" hidden={isEditing}>
                            {file?.name ? untruncatedDispName : "Untitled file"}
                        </p>
                        {canManage && (
                            <IconButton
                                size="sm"
                                label="Rename file"
                                variant="ghost"
                                className="rename-tick"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsEditing(true);
                                }}
                            >
                                <Icon name="edit" size={16} />
                            </IconButton>
                        )}
                    </div>
                </div>
                <div className="file-metadata">
                    <p className="info">
                        {fileType.toUpperCase()} {fileSize}
                    </p>
                    {!file.isVerified && <p className="info">Pending approval</p>}
                    <p className="contributor">{capitalise(contributor)}</p>
                </div>
            </div>
            <div className="file-actions">
                <IconButton
                    size="sm"
                    type="button"
                    variant="ghost"
                    className="star"
                    label={favourite ? "Remove from favourites" : "Add to favourites"}
                    title={favourite ? "Remove from favourites" : "Add to favourites"}
                    aria-pressed={!!favourite}
                    disabled={saving}
                    onClick={toggle}
                >
                    <img
                        src={new URL("./assets/Favorites.svg", import.meta.url).href}
                        alt=""
                        width="16"
                        height="16"
                    />
                </IconButton>
                <IconButton
                    size="sm"
                    type="button"
                    variant="ghost"
                    className="share"
                    label="Share file"
                    title="Share file"
                    onClick={() =>
                        share({
                            fileId: file._id,
                            name: file.name,
                            pending: !file.isVerified,
                            link: resourceLink(currCourseCode, currFolderId, file._id),
                        })
                    }
                >
                    <img
                        src={new URL("./assets/Share.svg", import.meta.url).href}
                        alt=""
                        width="16"
                        height="16"
                    />
                </IconButton>
                <IconButton
                    size="sm"
                    type="button"
                    variant="ghost"
                    className="download"
                    label={busy === "download" ? "Downloading file" : "Download file"}
                    title="Download file"
                    disabled={!!busy}
                    onClick={download}
                >
                    <img
                        src={new URL("./assets/Download.svg", import.meta.url).href}
                        alt=""
                        width="16"
                        height="16"
                    />
                </IconButton>
                {canManage && (
                    <IconButton
                        size="sm"
                        type="button"
                        label="Delete file"
                        variant="ghost"
                        className={`unverify ${triggerStyles.trigger}`}
                        onClick={handleUnverify}
                        title="Delete"
                    >
                        <Icon name="trash" />
                    </IconButton>
                )}
            </div>
            {canManage && (
                <ResourceConfirmation
                    error={actionError}
                    affectedCourses={file.affectedCourses}
                    isOpen={showDialog}
                    type={dialogType}
                    onConfirm={onConfirmAction}
                    onCancel={() => setShowDialog(false)}
                    isLoading={isProcessing}
                />
            )}
        </Card>
    );
};

export default FileDisplay;
