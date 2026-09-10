import { useId, useState } from "react";
import { Button, Dialog, FormField } from "@coursehub/ui";
import { normalizeCourseCode, isCourseCode } from "@coursehub/domain";
import { updateCourseName } from "../../apis/courses";
import styles from "@/styles/layout.module.scss";
export default function CourseEditor({ course, onClose, onSuccess }) {
    const [code, setCode] = useState(course.code),
        [name, setName] = useState(course.name === "Name Unavailable" ? "" : course.name || ""),
        [busy, setBusy] = useState(false),
        [error, setError] = useState("");
    const formId = useId();
    const save = async (event) => {
        event.preventDefault();
        if (busy) return;
        const newCode = normalizeCourseCode(code);
        if (!isCourseCode(newCode) || !name.trim()) {
            setError("Enter a valid course code and name.");
            return;
        }
        setBusy(true);
        setError("");
        try {
            const saved = await updateCourseName(course.code, name.trim(), newCode);
            if (!saved?.code)
                throw new Error(
                    "The saved course could not be confirmed. Your edits are retained.",
                );
            onSuccess(`Saved ${saved.code}. Course references and bookmarks are retained.`);
            onClose();
        } catch (failure) {
            setError(failure.message || "Could not save this course. Your edits are retained.");
        } finally {
            setBusy(false);
        }
    };
    return (
        <Dialog
            open
            onOpenChange={(open) => {
                if (!open) onClose();
            }}
            title="Edit course"
            description="Changing a course code or name also updates its saved references. Existing course bookmarks keep working."
            busy={busy}
            footer={
                <>
                    <Button variant="secondary" disabled={busy} onClick={onClose}>
                        Cancel
                    </Button>
                    <Button type="submit" form={formId} title="Save" busy={busy}>
                        Save changes
                    </Button>
                </>
            }
        >
            <form id={formId} onSubmit={save} className={styles.stack}>
                <FormField label="Course code" required>
                    <input
                        value={code}
                        maxLength={64}
                        disabled={busy}
                        onChange={(event) => setCode(event.target.value)}
                    />
                </FormField>
                <FormField label="Course name" required>
                    <input
                        value={name}
                        maxLength={200}
                        disabled={busy}
                        onChange={(event) => setName(event.target.value)}
                    />
                </FormField>
                {busy && <p role="status">Saving course and its references…</p>}
                {error && (
                    <p role="alert" className={styles.dangerText}>
                        {error}
                    </p>
                )}
            </form>
        </Dialog>
    );
}
