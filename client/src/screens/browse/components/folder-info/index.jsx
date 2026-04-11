import "./styles.scss";
import { toast } from "react-toastify";
import clientRoot from "../../../../api/server";
import Share from "../../../share";
import { useState } from "react";
import { createFolder } from "../../../../api/Folder";
import { ChangeFolder } from "../../../../actions/filebrowser_actions";
import { useDispatch, useSelector } from "react-redux";
import { ConfirmDialog } from "./confirmDialog";
import server from "../../../../api/server";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { fetchFolder } from "../../../../api/Folder";

const FolderInfo = ({
    isBR,
    path,
    name,
    canDownload,
    contributionHandler,
    folderId,
    courseCode,
    isMobileView = false, // New prop for mobile view
}) => {
    const dispatch = useDispatch();
    const currentFolder = useSelector((state) => state.fileBrowser.currentFolder);
    const [showConfirm, setShowConfirm] = useState(false);
    const [newFolderName, setNewFolderName] = useState("");
    const [childType, setChildType] = useState("File");
    const [isAdding, setIsAdding] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);

    const user = useSelector((state) => state.user.user);
    const isReadOnlyCourse = user?.readOnly?.some(
        (c) => c.code.toLowerCase() === courseCode?.toLowerCase()
    );

    const handleCreateFolder = () => {
        setNewFolderName("");
        setChildType("File");
        setShowConfirm(true);
    };

    const handleConfirmCreateFolder = async () => {
        if (isAdding) return;
        setIsAdding(true);
        const folderName = newFolderName.trim();
        if (!folderName?.trim() || !childType) {
            setIsAdding(false);
            return;
        }

        if (
            currentFolder?.children &&
            currentFolder.children.some(
                (item) => item.name.toLowerCase() === folderName.toLowerCase()
            )
        ) {
            toast.error(`A file or folder named "${folderName}" already exists.`);
            setIsAdding(false);
            return;
        }

        if (!courseCode || !folderId) {
            toast.error("No course selected.");
            setIsAdding(false);
            return;
        }

        try {
            const newFolder = await createFolder({
                name: folderName.trim(),
                course: courseCode,
                parentFolder: folderId,
                childType: childType,
            });

            if (currentFolder) {
                dispatch(
                    ChangeFolder({
                        ...currentFolder,
                        children: [...(currentFolder.children || []), newFolder],
                    })
                );
            }
            toast.success(`Folder "${folderName}" created`);
        } catch (error) {
            toast.error("Failed to create folder.");
        }
        setShowConfirm(false);
        setIsAdding(false);
    };

    const downloadFolder = async (id, folderPath = "") => {
        try {
            const data = await fetchFolder(id);

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
                                                error
                                            );
                                        })
                                );
                            }
                        });
                        await Promise.all(promises);
                    }
                } else {
                    try {
                        const fileResponse = await fetch(`${server}/api/files/download`, {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json",
                            },
                            body: JSON.stringify({ url: child.webUrl }),
                        });

                        if (!fileResponse.ok) {
                            toast.error(`Failed to download file: ${child.name}`);
                            continue;
                        }

                        const fileData = await fileResponse.json();
                        const downloadLink = fileData.downloadLink;

                        const curfile = await fetch(downloadLink);
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
            <div className="folder-info">
                <div className="info">
                    <p className="path">{path}</p>
                    <div className="curr-folder">
                        <p className="folder-name">{name}</p>
                        <div className="folder-actions"></div>
                    </div>
                </div>

                {!isMobileView && (
                    <div className="main-actions">
                        <button
                            className="btn download"
                            onClick={() => downloadAndSaveFolder(folderId, name)}
                            title="Download entire folder as ZIP"
                            disabled={isDownloading}
                        >
                            <span className="icon download-icon"></span>
                            <span className="text">{isDownloading ? "Download" : "Download"}</span>
                        </button>

                        {!isReadOnlyCourse && canDownload && (
                            <button className="btn primary" onClick={contributionHandler}>
                                <span className="icon plus-icon"></span>
                                <span className="text">{isBR ? "Add File" : "Contribute"}</span>
                            </button>
                        )}

                        {!isReadOnlyCourse && isBR && !canDownload && (
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
                )}
            </div>

            <Share link={`${clientRoot}/browse/${courseCode}/${folderId}`} />
            {!isMobileView && (
                <ConfirmDialog
                    show={showConfirm}
                    input={true}
                    inputValue={newFolderName}
                    onInputChange={(e) => setNewFolderName(e.target.value)}
                    childType={childType}
                    onChildTypeChange={setChildType}
                    onConfirm={handleConfirmCreateFolder}
                    onCancel={() => setShowConfirm(false)}
                />
            )}
        </>
    );
};

export default FolderInfo;
