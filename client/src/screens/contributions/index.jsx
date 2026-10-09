import Wrapper from "./components/wrapper";
import SectionC from "./components/sectionC";
import { FilePond, FileStatus } from "react-filepond";
import FilePondPluginFileValidateSize from "filepond-plugin-file-validate-size";
import { registerPlugin } from "react-filepond";
registerPlugin(FilePondPluginFileValidateSize);
import "filepond/dist/filepond.min.css";
import { useEffect, useRef, useState } from "react";
import "./styles.scss";
import { v4 as uuidv4 } from "uuid";
import { CreateNewContribution } from "../../api/Contribution";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";
import { useDispatch } from "react-redux";
import server from "../../api/server";
import { ChangeFolder, RefreshCurrentFolder } from "../../actions/filebrowser_actions";
import { fetchFolder } from "../../api/Folder";

const Contributions = () => {
    const uploadedBy = useSelector((state) => state.user.user._id);
    const userName = useSelector((state) => state.user.user.name);
    const currentFolder = useSelector((state) => state.fileBrowser.currentFolder);
    const currentCourseCode = useSelector((state) => state.fileBrowser.currentCourseCode);
    const [contributionId, setContributionId] = useState("");
    const dispatch = useDispatch();
    useEffect(() => {
        setContributionId(uuidv4());
    }, []);

    const [submitEnabled, setSubmitEnabled] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [totalFiles, setTotalFiles] = useState(0);
    const [validFiles, setValidFiles] = useState(0);

    const [fileItems, setFileItems] = useState([]);
    const [isDragging, setIsDragging] = useState(false);
    const [fileFeedback, setFileFeedback] = useState("");
    const [fileProgress, setFileProgress] = useState({});
    const pond = useRef();

    const closeDialog = () => {
        if (!isUploading) document.getElementById("contri")?.classList.remove("show");
    };

    const handleDrop = (event) => {
        event.preventDefault();
        setIsDragging(false);
        if (isUploading || !event.dataTransfer.files.length) return;
        pond.current?.addFiles(Array.from(event.dataTransfer.files)).catch(() => {
            // FilePond's error and warning callbacks present feedback below the list.
        });
    };

    const handleUpdateFiles = (fileItems) => {
        setFileItems(fileItems);
        setFileFeedback("");
        if (!fileItems.length) setFileProgress({});
        setTotalFiles(fileItems.length);
        const validCount = fileItems.filter(
            (item) => item.file.size <= 50*1024*1024
        ).length;
        setValidFiles(validCount);
        if (fileItems.length>0 && fileItems.length== validCount){
            setSubmitEnabled(true);
        }
        else setSubmitEnabled(false);
    };

    async function handleSubmit() {
        if (isUploading) return;

        const files = pond.current ? pond.current.getFiles() : [];
        if (!submitEnabled || !files.length) {
            toast.error("Please upload a valid file");
            return;
        }

        const collection = document.getElementsByClassName("contri");
        const contributionSection = collection[0];

        try {
            setIsUploading(true);
            setSubmitEnabled(false);
            await CreateNewContribution({
                parentFolder: currentFolder._id,
                courseCode: currentCourseCode || (currentFolder.courses ? currentFolder.courses[0] : currentFolder.course),
                description: "default",
                approved: false,
                contributionId,
                uploadedBy
            });
            await pond.current.processFiles();
            pond.current.removeFiles();
            contributionSection.classList.remove("show");
            toast.success("Files uploaded successfully!");
            setContributionId(uuidv4());
            setSubmitEnabled(true);
        } catch (error) {
            setSubmitEnabled(true);
            contributionSection.classList.remove("show");
            toast.error("Upload failed. Please try again!");
        } finally {
            setIsUploading(false);
        }

        try {
            const updatedFolder = await fetchFolder(currentFolder._id, currentCourseCode);
            dispatch(ChangeFolder(updatedFolder));
            dispatch(RefreshCurrentFolder());
        } catch (error) {
            return null;
        }
    }

    return (
        <SectionC>
            <Wrapper className={isUploading ? "upload-active" : totalFiles === 0 ? "upload-empty" : "upload-selected"}>
                <header className="upload-header">
                    <h2 id="upload-title">Share your files</h2>
                    <span className="upload-folder" title={currentFolder?.name || "Current folder"}>
                        [{currentFolder?.name || "Current folder"}]
                    </span>
                    {!isUploading && (
                        <button type="button" className="upload-close" aria-label="Close upload dialog"
                            onClick={closeDialog}>
                            <svg viewBox="0 0 18 18" aria-hidden="true"><path d="m3 3 12 12M15 3 3 15" /></svg>
                        </button>
                    )}
                </header>
                <div className="upload-body">
                    <div hidden={isUploading} className={`upload-dropzone${isDragging ? " is-dragging" : ""}`}
                        onDragOver={(event) => {
                            event.preventDefault();
                            if (!isUploading) setIsDragging(true);
                        }}
                        onDragLeave={(event) => {
                            if (!event.currentTarget.contains(event.relatedTarget)) setIsDragging(false);
                        }}
                        onDrop={handleDrop}>
                        {totalFiles === 0 && (
                            <svg className="upload-empty-icon" viewBox="0 0 32 32" aria-hidden="true">
                                <path d="M16 22V4m-7 7 7-7 7 7M4 22v6h24v-6" />
                            </svg>
                        )}
                        <div>
                            <p>Drag &amp; drop files here</p>
                            {totalFiles === 0 ? <p className="upload-or">or</p> : (
                                <p className="upload-limit">Max 50 MB per file</p>
                            )}
                        </div>
                        <button type="button" className="upload-browse" disabled={isUploading}
                            onClick={() => pond.current?.browse()}>Browse files</button>
                        {totalFiles === 0 && <p className="upload-limit">Max 50 MB per file</p>}
                    </div>
                    {totalFiles > 0 && (
                        <div className="upload-count" role="status" aria-live="polite">
                            {isUploading ? `UPLOADING ${totalFiles} ${totalFiles === 1 ? "FILE" : "FILES"}` :
                                `${validFiles} OF ${totalFiles} VALID`}
                        </div>
                    )}
                    <ul className="upload-file-list" aria-label="Selected files">
                        {fileItems.map((item) => {
                            const tooLarge = item.file.size > 50 * 1024 * 1024;
                            const failed = item.status === FileStatus.PROCESSING_ERROR ||
                                item.status === FileStatus.LOAD_ERROR;
                            const done = item.status === FileStatus.PROCESSING_COMPLETE;
                            const progress = done ? 1 : Math.min(1, Math.max(0, fileProgress[item.id] || 0));
                            return (
                                <li key={item.id} className={`upload-file${tooLarge || failed ? " is-invalid" : ""}`}>
                                    {tooLarge || failed ? (
                                        <svg className="upload-file-icon" viewBox="0 0 24 24" aria-hidden="true">
                                            <path d="M12 3 2 21h20L12 3Z" />
                                            <path d="M12 9v5m0 3v1" />
                                        </svg>
                                    ) : (
                                        <svg className="upload-file-icon" viewBox="0 0 24 24" aria-hidden="true">
                                            <path d="M6 2h8l4 4v16H6V2Z" />
                                            <path d="M14 2v5h4" />
                                        </svg>
                                    )}
                                    <div className="upload-file-details">
                                        <p className="upload-file-name" title={item.file.name}>{item.file.name}</p>
                                        <p className="upload-file-meta">
                                            {formatFileSize(item.file.size)}
                                            {tooLarge ? " · Too large, max 50 MB" : failed ? " · Upload failed" : ""}
                                        </p>
                                    </div>
                                    {isUploading ? (
                                        <>
                                            <span className="upload-progress-label">
                                                {failed ? "Failed" : done ? "Done" : progress === 1 ? "Processing…" : `${Math.round(progress * 100)}%`}
                                            </span>
                                            <div className="upload-progress-track" role="progressbar"
                                                aria-label={`Upload progress for ${item.file.name}`}
                                                aria-valuemin={0} aria-valuemax={100}
                                                aria-valuenow={Math.round(progress * 100)}
                                                aria-valuetext={done ? "Done" : failed ? "Failed" :
                                                    progress === 1 ? "Processing" : `${Math.round(progress * 100)}%`}>
                                                <span style={{ width: `${progress * 100}%` }} />
                                            </div>
                                        </>
                                    ) : (
                                        <button type="button" className="upload-remove"
                                            aria-label={`Remove ${item.file.name}`}
                                            onClick={() => pond.current?.removeFile(item.id)}>
                                            <svg viewBox="0 0 18 18" aria-hidden="true"><path d="m3 3 12 12M15 3 3 15" /></svg>
                                        </button>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                    {!isUploading && validFiles < totalFiles && (
                        <p className="upload-validation" role="status">
                            {totalFiles - validFiles === 1
                                ? "Remove the invalid file to enable Submit."
                                : "Remove the invalid files to enable Submit."}
                        </p>
                    )}
                    {fileFeedback && <p className="upload-feedback" role="alert">{fileFeedback}</p>}
                    {isUploading ? (
                        <div className="upload-reminder" role="status">
                            <strong>Please keep this window open</strong> until the upload finishes.
                        </div>
                    ) : <div className="upload-notes">
                        <ol>
                            <li>Keep this window open while files upload.</li>
                            <li>Branch Representative approval is needed before others see them.</li>
                        </ol>
                    </div>}
                </div>
                <footer className="upload-footer">
                    <button type="button" className="upload-submit" disabled={!submitEnabled || !validFiles || isUploading}
                        onClick={handleSubmit}>
                        {isUploading ? "Uploading…" : validFiles && validFiles === totalFiles ?
                            `Submit ${validFiles} ${validFiles === 1 ? "file" : "files"}` : "Submit"}
                    </button>
                    {!isUploading && (
                        <button type="button" className="upload-cancel"
                            onClick={closeDialog}>Cancel</button>
                    )}
                </footer>
                <div className="upload-engine" hidden aria-hidden="true">
                    <FilePond
                        name="file"
                        allowMultiple={true}
                        maxFileSize={50*1024*1024}
                        labelMaxFileSizeExceeded="File is too large"
                        labelMaxFileSize="Maximum file size is 50 MB"
                        onupdatefiles={handleUpdateFiles}
                        onerror={(error, file) => {
                            if (!file || file.file?.size <= 50 * 1024 * 1024) {
                                setFileFeedback(error.main || "Unable to add this file. Please try again.");
                            }
                        }}
                        onwarning={() => setFileFeedback("You can select a maximum of 40 files.")}
                        onprocessfileprogress={(file, progress) => {
                            setFileProgress((previous) => ({ ...previous, [file.id]: progress }));
                        }}
                        onprocessfilestart={(file) => {
                            setFileProgress((previous) => ({ ...previous, [file.id]: 0 }));
                        }}
                        onprocessfile={(error, file) => {
                            setFileItems(pond.current?.getFiles() || []);
                            if (error) setFileFeedback(`Could not upload ${file.filename}. Please try again.`);
                        }}
                        maxFiles={40}
                        server={{
                            url: `${server}/api/contribution/upload`,
                            process: {
                                headers: {
                                    "contribution-id": contributionId,
                                    username: userName,
                                },
                            },
                        }}
                        instantUpload={false}
                        allowProcess={false}
                        allowRevert={false}
                        allowBrowse={!isUploading}
                        allowDrop={!isUploading}
                        allowPaste={!isUploading}
                        allowRemove={!isUploading}
                        ref={(ref) => { pond.current = ref; }}
                    />
                </div>
            </Wrapper>
        </SectionC>
    );
};

function formatFileSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default Contributions;
