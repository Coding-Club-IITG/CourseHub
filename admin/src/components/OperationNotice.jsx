import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { operationEvent } from "@/apis/operations";

export default function OperationNotice() {
    const [operation, setOperation] = useState(null);
    useEffect(() => {
        const update = (event) => setOperation(event.detail || { status: "queued" });
        window.addEventListener(operationEvent, update);
        return () => window.removeEventListener(operationEvent, update);
    }, []);
    const activity =
        operation?.kind === "link"
            ? "Linking"
            : operation?.kind === "upload"
              ? "Upload"
              : "Cleanup";
    return (
        <div className="flex flex-wrap items-center justify-end gap-2 border-b border-gray-200 bg-white px-4 py-2 text-sm">
            {operation && (
                <span role="status">
                    {operation.status === "completed"
                        ? `${activity} completed.`
                        : operation.status === "failed"
                          ? `${activity} needs attention.`
                          : `${activity} is in progress. You can leave this page.`}
                </span>
            )}
            <Link
                className="rounded px-2 py-1 font-semibold text-blue-700 underline focus-visible:outline focus-visible:outline-2"
                to="/admin/operations"
            >
                Operations
            </Link>
        </div>
    );
}
