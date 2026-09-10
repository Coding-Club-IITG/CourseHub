import { useState } from "react";
import { ConfirmDialog } from "@coursehub/ui";
import { deleteStudent, refreshStudentCourses, refreshAllStudentCourses } from "../../apis/student";
import { deleteBR } from "../../apis/br";
const descriptions = {
    refresh:
        "Request a fresh upstream registration check. Saved data remains available while it runs.",
    delete: "Delete this student profile? Their uploaded library content and any BR registry assignment remain. This cannot be undone.",
    "remove-br":
        "Remove this BR registry assignment? Course content and student registrations remain.",
    "refresh-all":
        "Refresh registered courses for all students? This work is recorded in Operations and can continue if you leave the page.",
};
const titles = {
    refresh: "Refresh student courses?",
    delete: "Delete student?",
    "remove-br": "Remove BR access?",
    "refresh-all": "Refresh all courses?",
};
export default function ManagementDialog({ action, onClose, onSuccess }) {
    const [busy, setBusy] = useState(false),
        [error, setError] = useState("");
    const confirm = async () => {
        if (busy) return;
        setBusy(true);
        setError("");
        try {
            let result;
            if (action.type === "refresh") result = await refreshStudentCourses(action.item._id);
            else if (action.type === "delete") result = await deleteStudent(action.item._id);
            else if (action.type === "remove-br") result = await deleteBR(action.item.email);
            else result = await refreshAllStudentCourses();
            onSuccess(
                result?.message ||
                    {
                        refresh: "Registered courses refreshed.",
                        delete: "Student profile deleted.",
                        "remove-br": "BR access removed.",
                        "refresh-all": "Registered courses refreshed.",
                    }[action.type],
            );
            onClose();
        } catch (failure) {
            setError(failure.message || "The action could not finish. Please retry.");
        } finally {
            setBusy(false);
        }
    };
    return (
        <ConfirmDialog
            open
            onOpenChange={(open) => {
                if (!open) onClose();
            }}
            title={titles[action.type]}
            description={`${action.item ? `${action.item.name} (${action.item.email}). ` : ""}${descriptions[action.type]}`}
            confirmLabel={
                action.type.startsWith("refresh")
                    ? "Refresh"
                    : action.type === "delete"
                      ? "Delete"
                      : "Remove BR"
            }
            danger={!action.type.startsWith("refresh")}
            onConfirm={confirm}
            busy={busy}
            error={error}
        />
    );
}
