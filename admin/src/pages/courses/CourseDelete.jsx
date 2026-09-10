import { useState } from "react";
import { ConfirmDialog } from "@coursehub/ui";
import { deleteCourse } from "../../apis/courses";
export default function CourseDelete({ course, onClose, onSuccess }) {
    const [busy, setBusy] = useState(false),
        [error, setError] = useState("");
    const remove = async () => {
        if (busy) return;
        setBusy(true);
        setError("");
        try {
            await deleteCourse(course.code);
            onSuccess(
                `Course ${course.code} deleted. Shared content remains available in the other courses.`,
            );
            onClose();
        } catch (failure) {
            setError(
                failure.message ||
                    "Could not delete this course. Review Operations before retrying.",
            );
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
            title="Delete course?"
            description={`Delete ${course.code} - ${course.name || "Name Unavailable"}? This removes its saved course references and exclusive content. Shared folders are unlinked from this course and survive in their other courses. This cannot be undone.`}
            confirmLabel="Delete Course"
            danger
            busy={busy}
            error={error}
            onConfirm={remove}
        />
    );
}
