import "./styles.scss";
import { toast } from "react-toastify";
import { CopyToClipboard } from "react-copy-to-clipboard";
import clientRoot from "../../../../api/server";
import Share from "../../../share";
import { useState } from "react";
import { createFolder } from "../../../../api/Folder";
import { getCourse } from "../../../../api/Course";
import {
    ChangeCurrentCourse,
    ChangeCurrentYearData,
    ChangeFolder,
    UpdateCourses,
} from "../../../../actions/filebrowser_actions";
import { AddNewCourseLocal } from "../../../../actions/user_actions";
import { useDispatch, useSelector } from "react-redux";
import { RefreshCurrentFolder } from "../../../../actions/filebrowser_actions";
import { ConfirmDialog } from "./confirmDialog";
import server from "../../../../api/server";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { fetchFolder } from "../../../../api/Folder";

const FolderInfo = ({
    isBR,
    path,
    name,
    prof,
    canDownload,
    contributionHandler,
    folderId,
    courseCode,
    isMobileView = false, // New prop for mobile view
}) => {
    const dispatch = useDispatch();
    const currYear = useSelector((state) => state.fileBrowser.currentYear);
    const currentData = useSelector((state) => state.fileBrowser.currentData);
    const [showConfirm, setShowConfirm] = useState(false);
    const [newFolderName, setNewFolderName] = useState("");
    const [childType, setChildType] = useState("File");
    const [isAdding, setIsAdding] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);

    const user = useSelector((state) => state.user.user);
    const isReadOnlyCourse = user?.readOnly?.some(
        (c) => c.code.toLowerCase() === courseCode?.toLowerCase()
    );

    const handleShare = () => {
        const sectionShare = document.getElementById("share");
        sectionShare.classList.add("show");
    };

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
            currentData &&
            currentData.some((item) => item.name.toLowerCase() === folderName.toLowerCase())
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
            const res = await getCourse(courseCode);
            if (!res.data?.found) {
                toast.error("Course not found. Cannot create folder.");
                setIsAdding(false);
                return;
            }

            await createFolder({
                name: folderName.trim(),
                course: courseCode,
                parentFolder: folderId,
                childType: childType,
            });
            const { data } = await getCourse(courseCode);

            dispatch(UpdateCourses(data));
            dispatch(ChangeCurrentYearData(currYear, data.children[currYear].children));
            dispatch(RefreshCurrentFolder());
            toast.success(`Folder "${folderName}" created`);
        } catch (error) {
            // console.log(error);
            toast.error("Failed to create folder.");
        }
        setShowConfirm(false);
        setIsAdding(false);
    };

    const downloadFolder = async (id, folderPath = "") => {
        try {
            const data = await fetchFolder(id);

            const zip = new JSZip();

            // Process all children
            const childType = data.childType || "File"; // Default to "File" if not specified

            for (const child of data.children) {
                if (childType === "Folder") {
                    // Recursive case: child is a folder
                    const childFolderPath = folderPath ? `${folderPath}/${child.name}` : child.name;

                    // Recursively download the child folder
                    const childZip = await downloadFolder(child._id, childFolderPath);

                    if (childZip) {
                        // Add all files from child folder to current zip
                        // Use async approach to properly extract file content
                        const promises = [];
                        childZip.forEach((relativePath, file) => {
                            // Skip directory entries
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
                    // Base case: child is a file
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

                        // Add file to zip with proper folder structure
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

    // Usage function remains the same
    const downloadAndSaveFolder = async (folderId, folderName = "folder") => {
        if (isDownloading) return;

        let toastId;
        try {
            setIsDownloading(true);
            // Create a persistent toast that doesn't auto-close
            toastId = toast.info("Preparing to download folder...", {
                autoClose: false,
                closeOnClick: false,
                closeButton: false,
                draggable: false,
            });

            // Use either the fixed version or the alternative approach
            const zip = await downloadFolder(folderId);
            // const zip = await downloadFolderAlternative(folderId);

            if (!zip) {
                toast.dismiss(toastId);
                toast.error("Failed to create folder archive.");
                return;
            }

            // Generate the final ZIP blob
            const zipBlob = await zip.generateAsync({
                type: "blob",
                compression: "DEFLATE",
                compressionOptions: { level: 6 },
            });

            // Save the ZIP file using saveAs
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
                        {prof && (<p className="prof-name">Prof. {prof}</p>)}
                        <div className="folder-actions">
                            {folderId && courseCode && (
                                <>
                                    {/* Uncomment these if you want to add them back */}
                                    {/* <span
                                    className="folder-action-icon favs"
                                    onClick={() => {
                                        toast("Added to favourites.");
                                    }}
                                ></span>
                                <span
                                    className="folder-action-icon share"
                                    onClick={handleShare}
                                ></span> */}
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* Consolidated actions container - Hidden for mobile view */}
                {!isMobileView && (
                    <div className="main-actions">
                        {/* Download button - always visible */}
                        <button
                            className="btn download"
                            onClick={() => downloadAndSaveFolder(folderId, name)}
                            title="Download entire folder as ZIP"
                            disabled={isDownloading}
                        >
                            <span className="icon download-icon"></span>
                            <span className="text">{isDownloading ? "Download" : "Download"}</span>
                        </button>

                        {/* Conditional action buttons */}
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
