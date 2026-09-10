import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, IconButton, Icon } from "@coursehub/ui";
import { useSession } from "../../../../session/context";
import { library } from "../../../../session/runtime";
import { canManageCourse } from "../../../../utils/capabilities";
import { addYear, deleteYear } from "../../../../api/Year";
import { getSubtreeFileCount } from "../../../../utils/folderUtils";
import { ResourceConfirmation } from "../../../../components/content-dialogs";
import { ConfirmDialog } from "./confirmDialog";
import styles from "./styles.module.scss";
export default function YearInfo({ courseCode, course, currYear }) {
    const years = Array.isArray(course) ? course : [];
    const navigate = useNavigate(),
        user = useSession().data;
    const canManage = canManageCourse(user, courseCode);
    const [adding, setAdding] = useState(false),
        [deleting, setDeleting] = useState(null),
        [name, setName] = useState(""),
        [busy, setBusy] = useState(false),
        [error, setError] = useState("");
    const create = async () => {
        if (busy || !name) return;
        setBusy(true);
        setError("");
        try {
            await addYear({ name, course: courseCode });
            setAdding(false);
            await library.invalidate([courseCode]);
        } catch (failure) {
            setError(failure.message || "Failed to add year.");
        } finally {
            setBusy(false);
        }
    };
    const remove = async () => {
        if (busy || !deleting) return;
        setBusy(true);
        setError("");
        try {
            await deleteYear({ folderId: deleting._id, courseCode });
            setDeleting(null);
            await library.invalidate([courseCode]);
            if (years[currYear]?._id === deleting._id) navigate("/browse/" + courseCode);
        } catch (failure) {
            setError(failure.message || "Failed to remove year.");
        } finally {
            setBusy(false);
        }
    };
    const askRemove = (year) => {
        setError("");
        setDeleting(year);
    };
    return (
        <div className={styles.root}>
            <div className={styles.yearList}>
                {years.map((year, index) => (
                    <div key={year._id} className={styles.yearRow}>
                        <button
                            type="button"
                            className={styles.year}
                            aria-current={currYear === index ? "page" : undefined}
                            onClick={() => navigate("/browse/" + courseCode + "/" + year._id)}
                        >
                            {year.name}
                            {getSubtreeFileCount(year) === 0 && <small>Empty</small>}
                        </button>
                        {canManage && (
                            <IconButton
                                size="sm"
                                label={`Delete year ${year.name}`}
                                title="Delete Year"
                                variant="ghost"
                                onClick={() => askRemove(year)}
                            >
                                <Icon name="trash" />
                            </IconButton>
                        )}
                    </div>
                ))}
            </div>
            {canManage && (
                <div className={styles.actions}>
                    <Button
                        onClick={() => {
                            setName("");
                            setError("");
                            setAdding(true);
                        }}
                    >
                        <Icon name="plus" /> New Year
                    </Button>
                    {years[currYear] && (
                        <Button
                            className={styles.mobileDelete}
                            variant="secondary"
                            onClick={() => askRemove(years[currYear])}
                        >
                            <Icon name="trash" /> Remove year {years[currYear].name}
                        </Button>
                    )}
                </div>
            )}
            <ConfirmDialog
                show={adding}
                yearName={name}
                onYearNameChange={setName}
                course={years}
                onConfirm={create}
                onCancel={() => setAdding(false)}
                isLoading={busy}
                error={error}
            />
            <ResourceConfirmation
                resource="year"
                isOpen={!!deleting}
                onCancel={() => setDeleting(null)}
                onConfirm={remove}
                isLoading={busy}
                affectedCourses={deleting?.affectedCourses}
                courseCode={courseCode}
                error={error}
            />
        </div>
    );
}
