import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import {
    Button,
    IconButton,
    CloseIcon,
    FormField,
    Badge,
    LoadingState,
    EmptyState,
    ErrorState,
    Dialog,
    ConfirmDialog,
} from "../src";
import styles from "./styles.module.scss";
export default function Gallery() {
    const [open, setOpen] = useState(false),
        [confirm, setConfirm] = useState(false),
        [busy, setBusy] = useState(false),
        [error, setError] = useState("");
    return (
        <main className={styles.gallery}>
            <header>
                <p>COURSEHUB / SHARED UI</p>
                <h1>Familiar controls. One foundation.</h1>
                <p>
                    Black, warm yellow and clear, accessible states for students and administrators.
                </p>
            </header>
            <section>
                <h2>Actions</h2>
                <div className={styles.row}>
                    <Button>Contribute</Button>
                    <Button variant="dark">Download</Button>
                    <Button variant="secondary">Edit details</Button>
                    <Button variant="danger">Delete file</Button>
                    <Button variant="link">Close</Button>
                    <IconButton label="Close preview" variant="secondary">
                        <CloseIcon />
                    </IconButton>
                    <Button disabled>Unavailable</Button>
                    <Button busy busyLabel="Saving…">
                        Save
                    </Button>
                </div>
            </section>
            <section>
                <h2>Fields</h2>
                <div className={styles.grid}>
                    <FormField label="Course name" hint="Use the full course title." required>
                        <input placeholder="Introduction to Computer Science" />
                    </FormField>
                    <FormField label="Course code" error="Enter a valid course code.">
                        <input defaultValue="CS?" />
                    </FormField>
                    <FormField label="Semester">
                        <select defaultValue="3">
                            <option value="3">Semester 3</option>
                            <option value="4">Semester 4</option>
                        </select>
                    </FormField>
                    <FormField label="Notes">
                        <textarea rows="2" defaultValue="Material shared by CS101 and MA101." />
                    </FormField>
                </div>
            </section>
            <section>
                <h2>Status</h2>
                <div className={styles.row}>
                    {[
                        ["neutral", "Scheduled"],
                        ["warning", "Pending approval"],
                        ["success", "Completed"],
                        ["danger", "Failed"],
                        ["info", "Working"],
                    ].map(([tone, label]) => (
                        <Badge key={tone} tone={tone}>
                            {label}
                        </Badge>
                    ))}
                </div>
                <div className={styles.grid}>
                    <LoadingState title="Loading courses…" />
                    <EmptyState title="No courses yet">
                        <p>Your registered courses will appear here.</p>
                    </EmptyState>
                    <ErrorState
                        error={{
                            message: "Course service unavailable.",
                            requestId: "gallery-example",
                        }}
                        onRetry={() => {}}
                    />
                </div>
            </section>
            <section>
                <h2>Dialogs</h2>
                <div className={styles.row}>
                    <Button onClick={() => setOpen(true)}>Open dialog</Button>
                    <Button variant="danger" onClick={() => setConfirm(true)}>
                        Open confirmation
                    </Button>
                </div>
            </section>
            <Dialog
                open={open}
                onOpenChange={setOpen}
                title="Contribute to CS101"
                description="Only approved files are visible to other students."
                busy={busy}
                footer={
                    <>
                        <Button variant="secondary" disabled={busy} onClick={() => setOpen(false)}>
                            Close dialog
                        </Button>
                        <Button busy={busy} onClick={() => setConfirm(true)}>
                            Review impact
                        </Button>
                    </>
                }
            >
                <FormField label="Description">
                    <input placeholder="Lecture notes" />
                </FormField>
                <Button variant="link" onClick={() => setBusy(!busy)}>
                    Toggle busy state
                </Button>
                {Array.from({ length: 25 }, (_, i) => (
                    <p key={i}>
                        Lecture {i + 1} - A long descriptive filename for the shared course
                        library.pdf
                    </p>
                ))}
            </Dialog>
            <ConfirmDialog
                open={confirm}
                onOpenChange={setConfirm}
                title="Delete this shared file?"
                description="This file will be removed from CS101 and MA101."
                error={error}
                onConfirm={() => setError("Could not delete the file. Your selection is retained.")}
                confirmLabel="Delete file"
            />
        </main>
    );
}
createRoot(document.getElementById("root")).render(
    <StrictMode>
        <Gallery />
    </StrictMode>,
);
