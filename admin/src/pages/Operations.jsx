import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listOperations, retryOperation } from "@/apis/operations";

const active = ["planning", "queued", "running", "cancelling"];
export default function Operations() {
    const [page, setPage] = useState(1);
    const [status, setStatus] = useState("");
    const [data, setData] = useState(null);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(true);
    const [revision, setRevision] = useState(0);
    const [busy, setBusy] = useState(null);
    useEffect(() => {
        const controller = new AbortController();
        let timer;
        const load = async () => {
            try {
                const result = await listOperations(page, status, controller.signal);
                if (!Array.isArray(result.items))
                    throw new Error("Could not load operation status");
                if (controller.signal.aborted) return;
                setData(result);
                setError("");
                if (result.items.some((item) => active.includes(item.status)))
                    timer = setTimeout(load, 3000);
            } catch (failure) {
                if (!controller.signal.aborted) setError(failure.message);
            } finally {
                if (!controller.signal.aborted) setLoading(false);
            }
        };
        setLoading(true);
        load();
        return () => {
            controller.abort();
            clearTimeout(timer);
        };
    }, [page, status, revision]);
    const retry = async (id) => {
        setBusy(id);
        try {
            await retryOperation(id);
            setRevision((value) => value + 1);
        } catch (failure) {
            setError(failure.message);
        } finally {
            setBusy(null);
        }
    };
    const button =
        "rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600 disabled:opacity-50";
    return (
        <section className="mx-auto w-full max-w-5xl p-4 md:p-8">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Operations</h1>
                    <p className="mt-1 text-sm text-gray-600">
                        Upload results and recoverable content cleanup.
                    </p>
                </div>
                <Link className="text-sm text-blue-700 underline" to="/admin/courses">
                    Back to courses
                </Link>
            </div>
            <div className="mb-4 flex flex-wrap items-end gap-3">
                <label className="text-sm font-medium text-gray-700">
                    Status
                    <select
                        className="mt-1 block rounded-lg border border-gray-300 bg-white p-2"
                        value={status}
                        onChange={(event) => {
                            setStatus(event.target.value);
                            setPage(1);
                            setData(null);
                        }}
                    >
                        <option value="">All statuses</option>
                        {[
                            "failed",
                            "partial",
                            "queued",
                            "running",
                            "awaiting",
                            "completed",
                            "cancelling",
                            "cancelled",
                        ].map((value) => (
                            <option key={value} value={value}>
                                {value}
                            </option>
                        ))}
                    </select>
                </label>
                <button
                    className={button}
                    onClick={() => setRevision((value) => value + 1)}
                    disabled={loading}
                >
                    Refresh
                </button>
            </div>
            {error && (
                <p
                    role="alert"
                    className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"
                >
                    {error} Use Refresh to try again.
                </p>
            )}
            {loading && (
                <p role="status" className="mb-3 text-sm text-gray-600">
                    Updating operations…
                </p>
            )}
            {data?.items.length === 0 && (
                <p className="rounded-xl border border-gray-200 bg-white p-6 text-gray-600">
                    No operations match this status.
                </p>
            )}
            <ul className="space-y-4">
                {data?.items.map((item) => (
                    <li
                        key={item.id}
                        className="min-w-0 rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
                    >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                            <h2 className="min-w-0 break-words font-semibold text-gray-900">
                                {item.name}{" "}
                                <span className="font-normal text-gray-600">
                                    · {item.courseCode}
                                </span>
                            </h2>
                            <span className="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-800">
                                {item.status}
                            </span>
                        </div>
                        <p className="mt-2 text-sm text-gray-600">
                            {item.kind === "delete"
                                ? `Cleanup · ${item.completedSteps} ${item.completedSteps === 1 ? "step" : "steps"} completed`
                                : `${item.entries.filter((entry) => entry.state === "completed").length} of ${item.entries.length} files uploaded`}
                        </p>
                        {item.affectedCourses?.length > 1 && (
                            <p className="mt-2 text-sm text-gray-700">
                                Affected courses: {item.affectedCourses.join(", ")}
                            </p>
                        )}
                        {item.error?.message && (
                            <p className="mt-2 text-sm text-red-800">{item.error.message}</p>
                        )}
                        {item.kind === "delete" && item.status === "failed" && (
                            <p className="mt-2 text-sm text-gray-700">
                                Content stays unavailable until cleanup finishes. Retry resumes the
                                saved steps.
                            </p>
                        )}
                        {item.entries.length > 0 && (
                            <ul className="mt-3 space-y-2">
                                {item.entries.map((entry) => (
                                    <li
                                        key={entry.id}
                                        className="break-words border-t border-gray-100 pt-2 text-sm"
                                    >
                                        <span>{entry.name}</span>
                                        <span className="ml-2 text-gray-600">— {entry.state}</span>
                                        {entry.error?.message && (
                                            <p className="text-red-800">{entry.error.message}</p>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        )}
                        {item.canRetry && (
                            <button
                                className={`${button} mt-3`}
                                disabled={busy === item.id}
                                onClick={() => retry(item.id)}
                            >
                                {busy === item.id ? "Scheduling…" : "Retry unfinished work"}
                            </button>
                        )}
                    </li>
                ))}
            </ul>
            {data && data.total > 20 && (
                <nav
                    aria-label="Operation pages"
                    className="mt-4 flex flex-wrap items-center gap-3"
                >
                    <button
                        className={button}
                        disabled={page === 1 || loading}
                        onClick={() => {
                            setPage(page - 1);
                            setData(null);
                        }}
                    >
                        Previous
                    </button>
                    <span className="text-sm">
                        Page {page} of {Math.ceil(data.total / 20)}
                    </span>
                    <button
                        className={button}
                        disabled={page * 20 >= data.total || loading}
                        onClick={() => {
                            setPage(page + 1);
                            setData(null);
                        }}
                    >
                        Next
                    </button>
                </nav>
            )}
        </section>
    );
}
