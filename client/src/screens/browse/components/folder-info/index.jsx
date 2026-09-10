import { useCourseBrowser } from "../../../../queries/browserContext";
import { transport } from "../../../../api/http";
import { getFileDownloadLink } from "../../../../api/File";
import styles from "./styles.module.scss";
import { toast } from "react-toastify";
import { useShare } from "../../../share/context";
import { resourceLink } from "../../../../utils/resourceLink";
import { useState } from "react";
import { createFolder } from "../../../../api/Folder";

import { ConfirmDialog } from "./confirmDialog";

import JSZip from "jszip";
import { saveAs } from "file-saver";
import { fetchFolder } from "../../../../api/Folder";
import { getSubtreeFileCount } from "../../../../utils/folderUtils";

const FolderInfo = ({ path, name, canDownload, contributionHandler, folderId, courseCode }) => {
    const share = useShare();
    const currentFolder = useCourseBrowser().currentFolder;
    const totalSubtreeFiles = getSubtreeFileCount(currentFolder);
    const [showConfirm, setShowConfirm] = useState(false);
    const [newFolderName, setNewFolderName] = useState("");
    const [childType, setChildType] = useState("File");
    const [formError, setFormError] = useState("");
    const [isAdding, setIsAdding] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);

    const canManage = currentFolder?.capabilities?.canManage === true;
    const canContribute = currentFolder?.capabilities?.canContribute === true;

    const handleCreateFolder = () => {
        setFormError("");
        setNewFolderName("");
        setChildType("File");
        setShowConfirm(true);
    };

    const handleConfirmCreateFolder = async () => {
        if (isAdding) return;
        setIsAdding(true);
        setFormError("");
        const folderName = newFolderName.trim();
        if (!folderName?.trim() || !childType) {
            setIsAdding(false);
            return;
        }

        if (
            currentFolder?.children &&
            currentFolder.children.some(
                (item) => item.name.toLowerCase() === folderName.toLowerCase(),
            )
        ) {
            setFormError(`A file or folder named "${folderName}" already exists.`);
            setIsAdding(false);
            return;
        }

        if (!courseCode || !folderId) {
            toast.error("No course selected.");
            setIsAdding(false);
            return;
        }

        try {
            await createFolder({
                name: folderName.trim(),
                course: courseCode,
                parentFolder: folderId,
                childType: childType,
            });

            toast.success(`Folder "${folderName}" created`);
            setShowConfirm(false);
        } catch (error) {
            setFormError(error.message || "Failed to create folder.");
        }
        setIsAdding(false);
    };

    const downloadFolder = async (id, folderPath = "") => {
        try {
            const data = await fetchFolder(id, courseCode);

            const zip = new JSZip();

            const childType = data.childType || "File";

            for (const child of data.children) {
                if (childType === "Folder") {
                    const childFolderPath = folderPath ? `${folderPath}/${child.name}` : child.name;

                    const childZip = await downloadFolder(child._id, childFolderPath);

                    if (childZip) {
                        const promises = [];
                        childZip.forEach((relativePath, file) => {
                            if (!file.dir) {
                                promises.push(
                                    file
                                        .async("blob")
                                        .then((content) => {
                                            zip.file(relativePath, content);
                                        })
                                        .catch((error) => {
                                            console.error(
                                                `Error processing file ${relativePath}:`,
                                                error,
                                            );
                                        }),
                                );
                            }
                        });
                        await Promise.all(promises);
                    }
                } else {
                    try {
                        const downloadLink = await getFileDownloadLink(child._id, courseCode);

                        const curfile = await transport.request(downloadLink);
                        const fileBlob = await curfile.blob();

                        const filePath = folderPath ? `${folderPath}/${child.name}` : child.name;
                        zip.file(filePath, fileBlob);
                    } catch (error) {
                        console.error(`Error downloading file ${child.name}:`, error);
                        toast.error(`Failed to download file: ${child.name}`);
                    }
                }
            }

            return zip;
        } catch (error) {
            console.error(`Error downloading folder content:`, error);
            toast.error("Failed to download folder content.");
            return null;
        }
    };

    const downloadAndSaveFolder = async (folderId, folderName = "folder") => {
        if (isDownloading) return;

        let toastId;
        try {
            setIsDownloading(true);
            toastId = toast.info("Preparing to download folder...", {
                autoClose: false,
                closeOnClick: false,
                closeButton: false,
                draggable: false,
            });

            const zip = await downloadFolder(folderId);

            if (!zip) {
                toast.dismiss(toastId);
                toast.error("Failed to create folder archive.");
                return;
            }

            const zipBlob = await zip.generateAsync({
                type: "blob",
                compression: "DEFLATE",
                compressionOptions: { level: 6 },
            });

            saveAs(zipBlob, `${folderName}.zip`);

            toast.dismiss(toastId);
            toast.success("Folder Ready for download!");
        } catch (error) {
            console.error("Error in downloadAndSaveFolder:", error);
            if (toastId) {
                toast.dismiss(toastId);
            }
            toast.error("Failed to download folder.");
        } finally {
            setIsDownloading(false);
        }
    };
    return (
        <>
            <div className={`${styles.root} folder-info`}>
                <div className="info">
                    {currentFolder?.affectedCourses?.length > 1 && (
                        <p className="path">Shared by {currentFolder.affectedCourses.join(", ")}</p>
                    )}
                    <p className="path">{path}</p>
                    <div className="curr-folder" key={folderId || name}>
                        <p className="folder-name">{name}</p>
                        {currentFolder && (
                            <span
                                className="folder-header-count-badge"
                                title={`${totalSubtreeFiles} total files in subtree`}
                            >
                                {totalSubtreeFiles === 0
                                    ? "EMPTY"
                                    : `${totalSubtreeFiles} ${totalSubtreeFiles === 1 ? "FILE" : "FILES"}`}
                            </span>
                        )}
                    </div>
                </div>

                {
                    <div className="main-actions" role="group" aria-label="Folder actions">
                        <button
                            type="button"
                            className="btn share"
                            aria-label="Share folder"
                            onClick={() =>
                                share({
                                    kind: "folder",
                                    name,
                                    link: resourceLink(courseCode, folderId),
                                })
                            }
                        >
                            <span className="icon share-icon" aria-hidden="true" />
                            <span className="text">Share</span>
                        </button>
                        <button
                            className="btn download"
                            onClick={() => downloadAndSaveFolder(folderId, name)}
                            title="Download entire folder as ZIP"
                            disabled={isDownloading}
                        >
                            <span className="icon download-icon"></span>
                            <span className="text">
                                {isDownloading ? "Preparing…" : "Download"}
                            </span>
                        </button>

                        {canContribute && canDownload && (
                            <button className="btn primary" onClick={contributionHandler}>
                                <span className="icon plus-icon"></span>
                                <span className="text">
                                    {canManage ? "Add File" : "Contribute"}
                                </span>
                            </button>
                        )}

                        {canManage && !canDownload && (
                            <button
                                className="btn primary"
                                onClick={handleCreateFolder}
                                disabled={isAdding}
                            >
                                <span className="icon plus-icon"></span>
                                <span className="text">
                                    {isAdding ? "Creating..." : "Add Folder"}
                                </span>
                            </button>
                        )}
                    </div>
                }
            </div>

            {
                <ConfirmDialog
                    show={showConfirm}
                    isLoading={isAdding}
                    error={formError}
                    input={true}
                    inputValue={newFolderName}
                    onInputChange={(e) => setNewFolderName(e.target.value)}
                    childType={childType}
                    onChildTypeChange={setChildType}
                    onConfirm={handleConfirmCreateFolder}
                    onCancel={() => setShowConfirm(false)}
                />
            }
        </>
    );
};

export default FolderInfo;
