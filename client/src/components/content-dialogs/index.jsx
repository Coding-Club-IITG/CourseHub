import styles from "./styles.module.scss";
import { useEffect, useRef, useState } from "react";
import { Button, ConfirmDialog, FormField } from "@coursehub/ui";

export function ResourceConfirmation({
    isOpen,
    type = "delete",
    resource = "file",
    onConfirm,
    onCancel,
    isLoading,
    affectedCourses = [],
    courseCode,
    error,
}) {
    const shared = affectedCourses.length > 1;
    const verify = type === "verify";
    const unlink = shared && resource !== "file";
    const description = verify
        ? `Once verified, this file will be visible to signed-in students.${shared ? ` Verification publishes it in every listed course: ${affectedCourses.join(", ")}.` : ""}`
        : unlink
          ? `Remove this ${resource} from ${courseCode}? It remains available to the other linked courses: ${affectedCourses.filter((code) => code !== courseCode).join(", ")}.`
          : `This ${resource}${resource !== "file" ? " and its contents" : ""} will be permanently deleted.${shared ? ` This shared file is used by ${affectedCourses.join(", ")}. Deleting it removes it from every listed course.` : ""} This action cannot be undone.`;
    return (
        <ConfirmDialog
            open={isOpen}
            onOpenChange={(open) => {
                if (!open) onCancel();
            }}
            title={
                verify ? "Verify this file?" : `${unlink ? "Remove" : "Delete"} this ${resource}?`
            }
            description={description}
            confirmLabel={verify ? "Verify" : unlink ? "Remove" : "Delete"}
            danger={!verify}
            onConfirm={onConfirm}
            busy={isLoading}
            error={error}
        />
    );
}
export function InlineRename({
    initialName = "",
    resource = "file",
    onCancel,
    onSave,
    affectedCourses = [],
}) {
    const [name, setName] = useState(initialName),
        [busy, setBusy] = useState(false),
        [error, setError] = useState("");
    const input = useRef(null),
        opener = useRef(document.activeElement);
    useEffect(() => {
        input.current?.focus();
        input.current?.select();
        const target = opener.current;
        return () => {
            if (target?.isConnected) target.focus({ preventScroll: true });
        };
    }, []);
    useEffect(() => { if (!busy && error) input.current?.focus(); }, [busy, error]);
    const save = async (event) => {
        event.preventDefault();
        if (busy) return;
        if (!name.trim()) {
            setError("Enter a name.");
            return;
        }
        setBusy(true);
        setError("");
        try {
            await onSave(name.trim());
            onCancel();
        } catch (failure) {
            setError(failure.message || "The name could not be saved. Please retry.");
        } finally {
            setBusy(false);
        }
    };
    return (
        <form
            className={styles.rename}
            onSubmit={save}
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => {
                if (event.key === "Escape" && !busy) {
                    event.stopPropagation();
                    onCancel();
                }
            }}
        >
            <FormField
                label={`${resource === "file" ? "File" : "Folder"} name`}
                error={error}
                hint={
                    affectedCourses.length > 1
                        ? `Renaming changes this ${resource} in ${affectedCourses.join(", ")}.`
                        : undefined
                }
            >
                <input
                    ref={input}
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    disabled={busy}
                    maxLength={255}
                />
            </FormField>
            <div className={styles.actions}>
                <Button type="submit" busy={busy} busyLabel="Saving…">
                    Save name
                </Button>
                <Button variant="link" onClick={onCancel} disabled={busy}>
                    Cancel
                </Button>
            </div>
        </form>
    );
}
