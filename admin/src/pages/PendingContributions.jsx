import React, { useState, useEffect } from "react";
import {
    fetchAllPendingContributions,
    handleContribution,
    getFileDownloadUrl,
} from "@/apis/courses";
import { toast } from "react-toastify";
import { FiFile, FiCheck, FiX, FiEye, FiDownload, FiInbox } from "react-icons/fi";

export default function PendingApprovals() {
    const [pending, setPending] = useState([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState(null);

    const loadPending = async () => {
        try {
            setLoading(true);
            const response = await fetchAllPendingContributions();
            setPending(response.pending || []);
        } catch (err) {
            toast.error(err.message || "Failed to load pending approvals.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadPending();
    }, []);

    const onAction = async (contributionId, action) => {
        if (processingId) return;

        const confirmMessage =
            action === "reject"
                ? "Reject this contribution? Its files will be permanently deleted from storage. This cannot be undone."
                : "Approve this contribution and publish its files?";
        if (!window.confirm(confirmMessage)) return;

        try {
            setProcessingId(contributionId);
            await handleContribution(contributionId, action);
            toast.success(action === "approve" ? "Contribution approved." : "Contribution rejected.");
            // Drop the handled row without a full refetch.
            setPending((prev) => prev.filter((c) => c.contributionId !== contributionId));
        } catch (err) {
            toast.error(err.message || `Failed to ${action} contribution.`);
        } finally {
            setProcessingId(null);
        }
    };

    const onDownload = async (fileId) => {
        try {
            const data = await getFileDownloadUrl(fileId);
            if (data?.url) {
                window.location.href = data.url;
            }
        } catch (err) {
            toast.error("Failed to get download link.");
        }
    };

    return (
        <div className="p-6 space-y-6">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/60 p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Pending Approvals</h1>
                    <p className="text-gray-600 mt-1">
                        All unverified files across every course, awaiting review.
                    </p>
                </div>
                {!loading && (
                    <span className="rounded-full bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-700">
                        {pending.length} pending
                    </span>
                )}
            </div>

            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/60 p-6">
                {loading ? (
                    <p className="text-sm text-slate-500">Loading pending approvals...</p>
                ) : pending.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                        <FiInbox className="mb-3 text-3xl text-slate-300" />
                        <div className="text-sm font-semibold text-slate-900">You're all caught up</div>
                        <div className="mt-0.5 text-sm text-slate-500">
                            No files are waiting for approval.
                        </div>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {pending.map((contribution) => (
                            <div
                                key={contribution.contributionId}
                                className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 px-3.5 py-3"
                            >
                                <span className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-lg bg-amber-50 text-base text-amber-700">
                                    <FiFile />
                                </span>

                                <div className="min-w-0 flex-1">
                                    <div className="text-xs font-semibold uppercase text-blue-700">
                                        {contribution.courseCode}
                                    </div>
                                    {contribution.files && contribution.files.length > 0 ? (
                                        <div className="mt-1 flex flex-col gap-1">
                                            {contribution.files.map((file) => (
                                                <div
                                                    key={file._id}
                                                    className="flex flex-wrap items-center gap-2"
                                                >
                                                    <span className="truncate text-sm font-medium text-slate-900">
                                                        {file.name}
                                                    </span>
                                                    {file.webUrl && (
                                                        <a
                                                            href={file.webUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-0.5 text-xs font-medium text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                                                        >
                                                            <FiEye /> View
                                                        </a>
                                                    )}
                                                    {file.fileId && (
                                                        <button
                                                            onClick={() => onDownload(file.fileId)}
                                                            className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-0.5 text-xs font-medium text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                                                        >
                                                            <FiDownload /> Download
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="mt-1 text-sm text-slate-500">
                                            {contribution.contributionId} (no files)
                                        </div>
                                    )}
                                    <div className="mt-1 text-xs text-slate-500">Awaiting review</div>
                                </div>

                                <div className="flex flex-shrink-0 gap-2">
                                    <button
                                        onClick={() => onAction(contribution.contributionId, "approve")}
                                        disabled={processingId === contribution.contributionId}
                                        className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60"
                                    >
                                        <FiCheck /> Approve
                                    </button>
                                    <button
                                        onClick={() => onAction(contribution.contributionId, "reject")}
                                        disabled={processingId === contribution.contributionId}
                                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-red-600 hover:border-red-200 hover:bg-red-50 disabled:opacity-60"
                                    >
                                        <FiX /> Reject
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}