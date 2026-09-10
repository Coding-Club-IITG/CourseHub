import { useState } from "react";
import {
    Card,
    CardCode,
    CardHeader,
    CardTitle,
    CloseIcon,
    IconButton,
    ConfirmDialog,
} from "@coursehub/ui";
import { capitalise } from "../../../../utils/capitalise";
import { DeleteCourseAPI } from "../../../../api/User";
import styles from "./styles.module.scss";
export default function CourseCard({
    code,
    color,
    name,
    type,
    setClicked,
    isReadOnly,
    onCourseRemoved,
}) {
    const [open, setOpen] = useState(false),
        [busy, setBusy] = useState(false),
        [error, setError] = useState("");
    const remove = async () => {
        if (busy) return;
        setBusy(true);
        setError("");
        try {
            await DeleteCourseAPI(code);
            onCourseRemoved?.(code);
            setOpen(false);
        } catch (failure) {
            setError(failure.message || "The course could not be removed. Please retry.");
        } finally {
            setBusy(false);
        }
    };
    return type === "ADD" ? (
        <button type="button" className={`${styles.add} coursecard ADD`} onClick={setClicked}>
            <span aria-hidden="true">+</span>Add Course
        </button>
    ) : (
        <Card
            as="article"
            interactive
            className={`${styles.card} coursecard`}
            style={{ backgroundColor: color }}
        >
            <button type="button" className={styles.open} onClick={setClicked} title={name}>
                <CardHeader>
                    <CardCode>{code}</CardCode>
                </CardHeader>
                <CardTitle lines={3} className={`${styles.title} name`}>
                    {name ? capitalise(name) : "Name unavailable"}
                </CardTitle>
            </button>
            {isReadOnly && (
                <IconButton
                    className={styles.remove}
                    label="Remove course"
                    variant="ghost"
                    onClick={() => {
                        setError("");
                        setOpen(true);
                    }}
                >
                    <CloseIcon />
                </IconButton>
            )}
            <ConfirmDialog
                open={open}
                title="Remove this course?"
                description="Remove this course from Others? It can be added again. Library content is kept."
                confirmLabel="Remove"
                onConfirm={remove}
                onOpenChange={setOpen}
                busy={busy}
                error={error}
            />
        </Card>
    );
}
