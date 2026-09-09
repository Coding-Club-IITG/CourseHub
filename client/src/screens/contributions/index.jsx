import Wrapper from "./components/wrapper";
import SectionC from "./components/sectionC";
import { FilePond } from "react-filepond";
import "filepond/dist/filepond.min.css";
import { useEffect, useRef, useState } from "react";
import { isUploadLimits, uploadLimitsLabel, uploadLimitsError } from "@coursehub/domain";
import { useLocation } from "react-router-dom";
import "./styles.scss";
import { CreateNewContribution } from "../../api/Contribution";
import { useCourseBrowser } from "../../queries/browserContext";
import { library } from "../../session/runtime";
import server from "../../api/server";

import { transport } from "../../api/http";
import {
    getOperation,
    retryOperation,
    cancelOperation,
    announceOperation,
} from "../../api/Operation";

const stateLabels = {
    pending: "Ready to upload",
    receiving: "Receiving",
    queued: "Waiting for storage",
    uploading: "Uploading",
    publishing: "Saving",
    cleanup: "Cleaning up unpublished file",
    completed: "Uploaded",
    failed: "Failed",
    cancelled: "Cancelled",
};
const Contributions = () => {
    const currentFolder = useCourseBrowser().currentFolder;
    const currentCourseCode = useCourseBrowser().currentCourseCode;
    const isBR = currentFolder?.capabilities?.canManage === true;
    const location = useLocation();
    const pond = useRef();
    const operationRef = useRef();
    const requestKey = useRef();
    const uploadHeaders = useRef("");
    const fileIds = useRef(new Map());
    const transfers = useRef(new Map());
    const mounted = useRef(true);
    const [sentBytes, setSentBytes] = useState({});
    useEffect(() => {
        mounted.current = true;
        const activeTransfers = transfers.current;
        return () => {
            mounted.current = false;
            for (const stop of activeTransfers.values()) stop();
        };
    }, []);
    const [limits, setLimits] = useState();
    const [operation, setOperation] = useState();
    const [fileCount, setFileCount] = useState(0);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const [limitsAttempt, setLimitsAttempt] = useState(0);
    const [limitsError, setLimitsError] = useState(false);
    const [statusError, setStatusError] = useState("");
    const showOperation = (value) => {
        if (!mounted.current) return;
        operationRef.current = value;
        setOperation(value);
        setStatusError("");
        announceOperation(value);
    };

    useEffect(() => {
        const controller = new AbortController();
        setLimitsError(false);
        transport
            .json("contribution/limits", { signal: controller.signal })
            .then((data) => {
                if (!isUploadLimits(data)) throw new Error("Invalid upload limits");
                setLimits(data);
            })
            .catch(() => {
                if (!controller.signal.aborted) setLimitsError(true);
            });
        return () => controller.abort();
    }, [limitsAttempt]);
    useEffect(() => {
        const id = new URLSearchParams(location.search).get("upload");
        if (!id || !currentFolder?._id || !currentCourseCode) return;
        const controller = new AbortController();
        getOperation(id, controller.signal)
            .then((value) => {
                if (
                    value.kind !== "upload" ||
                    value.folderId !== currentFolder?._id ||
                    value.courseCode !== currentCourseCode
                )
                    throw new Error("Choose the folder belonging to this upload.");
                showOperation(value);
                document.querySelector(".contri")?.classList.add("show");
            })
            .catch(() => {
                if (!controller.signal.aborted) setError("This upload could not be loaded.");
            });
        return () => controller.abort();
    }, [location.key, location.search, currentFolder?._id, currentCourseCode]);
    useEffect(() => {
        if (
            !operation ||
            !["queued", "running", "cancelling", "planning"].includes(operation.status)
        )
            return;
        const controller = new AbortController();
        const timer = setTimeout(
            () =>
                getOperation(operation.id, controller.signal)
                    .then(showOperation)
                    .catch(() => {
                        if (!controller.signal.aborted) setStatusError("Status could not refresh.");
                    }),
            1500,
        );
        return () => {
            clearTimeout(timer);
            controller.abort();
        };
    }, [operation]);

    function sendFile(file, id, op) {
        return new Promise((resolve, reject) => {
            const controller = new AbortController();
            const xhr = new XMLHttpRequest();
            let aborted = false;
            const finish = (error) => {
                transfers.current.delete(id);
                if (error) reject(error);
                else resolve();
            };
            transfers.current.set(id, () => {
                aborted = true;
                controller.abort();
                xhr.abort();
                finish(
                    new Error("The transfer was stopped. Check the batch status before retrying."),
                );
            });
            xhr.open("POST", `${server}/api/contribution/upload`);
            xhr.withCredentials = true;
            xhr.timeout = 15 * 60 * 1000;
            for (const [name, value] of Object.entries({
                "contribution-id": op.id,
                "upload-file-id": id,
                ...uploadHeaders.current,
            }))
                xhr.setRequestHeader(name, value);
            xhr.upload.onprogress = (event) =>
                setSentBytes((current) => ({
                    ...current,
                    [id]: Math.min(file.size, event.loaded),
                }));
            xhr.onerror = xhr.ontimeout = () => {
                if (!aborted) finish(new Error("The connection failed. Retry this file."));
            };
            xhr.onload = async () => {
                try {
                    const data = JSON.parse(xhr.responseText);
                    transport.checkResponse(xhr.status, data);
                    if (xhr.status !== 202)
                        throw new Error(data.message || "This file was not accepted");
                    for (;;) {
                        const current = await getOperation(op.id, controller.signal);
                        if (aborted) return;
                        showOperation(current);
                        const entry = current.entries.find((item) => item.id === id);
                        if (entry?.state === "completed") return finish();
                        if (
                            ["failed", "cancelled"].includes(entry?.state) ||
                            current.status === "failed"
                        )
                            throw new Error(
                                entry?.error?.message ||
                                    current.error?.message ||
                                    "This file could not be uploaded",
                            );
                        await new Promise((resolve) => setTimeout(resolve, 1000));
                    }
                } catch (failure) {
                    if (!aborted) finish(failure);
                }
            };
            const body = new FormData();
            body.append("file", file, file.name);
            xhr.send(body);
        });
    }

    async function handleSubmit() {
        if (busy || !limits) return;
        const files = pond.current?.getFiles() || [];
        if (!files.length) {
            setError("Choose the files to upload or retry.");
            return;
        }
        if (
            files.length > limits.files ||
            files.some(({ file }) => file.size > limits.fileBytes) ||
            files.reduce((sum, item) => sum + item.file.size, 0) > limits.batchBytes
        ) {
            setError(uploadLimitsError(limits));
            return;
        }
        setBusy(true);
        setError("");
        try {
            let current = operationRef.current;
            if (!current) {
                requestKey.current ||= crypto.randomUUID();
                const data = await CreateNewContribution(
                    {
                        parentFolder: currentFolder._id,
                        courseCode: currentCourseCode || currentFolder.courses?.[0],
                        description: "",
                        manifest: files.map(({ file }) => ({ name: file.name, size: file.size })),
                    },
                    requestKey.current,
                );
                current = data;
                showOperation(current);
            } else if (["failed", "partial"].includes(current.status)) {
                current = await retryOperation(current.id);
                showOperation(current);
            }
            for (const file of fileIds.current.keys())
                if (!files.some((item) => item.file === file)) fileIds.current.delete(file);
            const assigned = new Set(fileIds.current.values());
            const available = current.entries.filter(
                (entry) => entry.state !== "completed" && !assigned.has(entry.id),
            );
            for (const item of files) {
                if (fileIds.current.has(item.file)) continue;
                const index = available.findIndex(
                    (entry) => entry.name === item.file.name && entry.size === item.file.size,
                );
                if (index < 0)
                    throw new Error("Choose the original failed files to retry this batch.");
                fileIds.current.set(item.file, available.splice(index, 1)[0].id);
            }
            transport.clearCsrfToken();
            uploadHeaders.current = await transport.uploadHeaders();
            const queue = files.filter(
                (item) =>
                    current.entries.find((entry) => entry.id === fileIds.current.get(item.file))
                        ?.state !== "completed",
            );
            const failures = [];
            await Promise.all(
                Array.from({ length: limits.concurrentFiles }, async () => {
                    while (queue.length && !operationRef.current?.cancelRequested) {
                        const item = queue.shift();
                        try {
                            await sendFile(item.file, fileIds.current.get(item.file), current);
                        } catch (failure) {
                            failures.push(failure);
                        }
                    }
                }),
            );
            if (failures.length && !operationRef.current?.cancelRequested) throw failures[0];
            let result = await getOperation(current.id);
            while (
                ["queued", "running"].includes(result.status) &&
                result.entries.every((entry) => entry.state === "completed")
            ) {
                await new Promise((resolve) => setTimeout(resolve, 500));
                result = await getOperation(current.id);
            }
            showOperation(result);
        } catch (failure) {
            setError(
                failure.message ||
                    "Some files failed. Successful uploads are preserved; retry the failed files.",
            );
            if (operationRef.current) {
                try {
                    const result = await getOperation(operationRef.current.id);
                    showOperation(result);
                    if (result.entries.some((entry) => entry.error?.message === failure.message))
                        setError("");
                } catch {
                    /* Status retry remains available. */
                }
            }
        } finally {
            if (mounted.current) {
                setBusy(false);
                try {
                    await library.invalidate([currentCourseCode]);
                } catch {
                    /* The operation result is retained when the folder cannot refresh. */
                }
            }
        }
    }
    async function handleCancel() {
        if (!operationRef.current) return;
        try {
            showOperation(await cancelOperation(operationRef.current.id));
            for (const stop of transfers.current.values()) stop();
            setBusy(false);
        } catch {
            setError("Cancellation could not be confirmed. Retry cancellation or check status.");
        }
    }
    const reset = () => {
        pond.current?.removeFiles();
        operationRef.current = undefined;
        requestKey.current = undefined;
        fileIds.current.clear();
        setSentBytes({});
        setFileCount(0);
        setStatusError("");
        setOperation(undefined);
        setError("");
    };
    const closed = operation && ["completed", "cancelled"].includes(operation.status);
    const canSend =
        currentFolder?.capabilities?.canContribute === true &&
        (!operation || operation.canCancel === true);
    const serverBusy =
        operation && ["planning", "queued", "running", "cancelling"].includes(operation.status);
    const canSelect = canSend && !closed && !busy && !serverBusy;
    const close = () => document.querySelector(".contri")?.classList.remove("show");
    return (
        <SectionC busy={busy}>
            <Wrapper>
                <div className="upload-content">
                    <header className="upload-header">
                        <h2>{isBR ? "Upload Files" : "Share Your Files"}</h2>
                        <p>To {currentFolder?.name || "this folder"}</p>
                    </header>
                    <div className="upload-body">
                        {operation && (
                            <div
                                className="upload-results"
                                aria-label="Upload results"
                                aria-live="polite"
                            >
                                <p className="upload-summary">
                                    {
                                        operation.entries.filter(
                                            (entry) => entry.state === "completed",
                                        ).length
                                    }{" "}
                                    of {operation.entries.length} files uploaded
                                </p>
                                <ul>
                                    {operation.entries.map((entry) => (
                                        <li key={entry.id} data-state={entry.state}>
                                            <span className="upload-file-name">{entry.name}</span>
                                            <strong>
                                                {busy &&
                                                entry.state === "pending" &&
                                                sentBytes[entry.id] !== undefined
                                                    ? "Sending"
                                                    : stateLabels[entry.state] || entry.state}
                                            </strong>
                                            {["failed", "cleanup"].includes(entry.state) &&
                                                entry.error?.message && (
                                                    <span className="upload-error">
                                                        {entry.error.message}
                                                    </span>
                                                )}
                                            {((busy &&
                                                sentBytes[entry.id] !== undefined &&
                                                entry.state !== "completed") ||
                                                ["receiving", "uploading", "publishing"].includes(
                                                    entry.state,
                                                )) && (
                                                <progress
                                                    max={entry.size}
                                                    value={
                                                        entry.state === "pending" ||
                                                        entry.state === "receiving"
                                                            ? (sentBytes[entry.id] || 0) / 2
                                                            : entry.size / 2 +
                                                              (entry.uploadedBytes || 0) / 2
                                                    }
                                                    aria-label={entry.name + " storage progress"}
                                                />
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                        {/* Keep the picker mounted so retained File objects can be retried. */}
                        {canSend && !closed && (
                            <div className="upload-picker" hidden={!canSelect}>
                                {operation && (
                                    <p className="upload-hint">
                                        Choose the original failed files to resume.
                                    </p>
                                )}
                                <FilePond
                                    name="file"
                                    allowMultiple
                                    maxFiles={limits?.files || 40}
                                    disabled={!limits || Boolean(operation?.cancelRequested)}
                                    onupdatefiles={(files) => setFileCount(files.length)}
                                    allowDrop={!busy}
                                    allowBrowse={!busy}
                                    allowRemove={!busy}
                                    instantUpload={false}
                                    allowProcess={false}
                                    allowRevert={false}
                                    ref={(value) => {
                                        pond.current = value;
                                    }}
                                />
                                <p className="upload-limits">{uploadLimitsLabel(limits)}</p>
                            </div>
                        )}
                        {limitsError && (
                            <p className="upload-error" role="alert">
                                Upload limits are unavailable.{" "}
                                <button
                                    className="upload-text-button"
                                    type="button"
                                    onClick={() => setLimitsAttempt((value) => value + 1)}
                                >
                                    Retry upload limits
                                </button>
                            </p>
                        )}
                        {!limits && !limitsError && (
                            <p className="upload-hint" role="status">
                                Loading upload settings…
                            </p>
                        )}
                        {error && (
                            <p className="upload-error" role="alert">
                                {error}
                            </p>
                        )}
                        {statusError && (
                            <p className="upload-error" role="alert">
                                {statusError}{" "}
                                <button
                                    className="upload-text-button"
                                    type="button"
                                    onClick={() =>
                                        getOperation(operation.id)
                                            .then(showOperation)
                                            .catch(() =>
                                                setStatusError("Status could not refresh."),
                                            )
                                    }
                                >
                                    Refresh status
                                </button>
                            </p>
                        )}
                        {operation && ["partial", "cancelled"].includes(operation.status) && (
                            <p className="upload-hint">Uploaded files are kept.</p>
                        )}
                        {!isBR && (!operation || operation.status === "completed") && (
                            <p className="upload-hint">
                                Your files need approval before other students can see them.
                            </p>
                        )}
                    </div>
                    <footer className="upload-actions">
                        {!closed && canSend && !serverBusy && (
                            <button
                                type="button"
                                className="upload-button upload-primary"
                                disabled={
                                    !fileCount || busy || !limits || operation?.cancelRequested
                                }
                                onClick={handleSubmit}
                            >
                                {busy
                                    ? "Uploading…"
                                    : operation
                                      ? "Retry failed files"
                                      : "Upload files"}
                            </button>
                        )}
                        {operation?.canCancel && (
                            <button
                                type="button"
                                className="upload-button upload-secondary"
                                onClick={handleCancel}
                            >
                                Cancel remaining uploads
                            </button>
                        )}
                        {closed && currentFolder?.capabilities?.canContribute === true && (
                            <button
                                type="button"
                                className="upload-button upload-primary"
                                onClick={reset}
                                disabled={busy}
                            >
                                Start another batch
                            </button>
                        )}
                        {!busy && (
                            <button
                                type="button"
                                className="upload-text-button upload-close"
                                onClick={close}
                            >
                                Close
                            </button>
                        )}
                    </footer>
                </div>
            </Wrapper>
        </SectionC>
    );
};
export default Contributions;
