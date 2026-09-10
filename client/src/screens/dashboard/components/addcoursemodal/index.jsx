import { useEffect, useRef, useState } from "react";
import { Button, Dialog, FormField, LoadingState } from "@coursehub/ui";
import { useSession } from "../../../../session/context";
import { normalizeCourseCode } from "@coursehub/domain";
import { GetSearchResult } from "../../../../api/Search";
import styles from "./styles.module.scss";
export default function AddCourseModal({ open, onOpenChange, handleAddCourse }) {
    const [code, setCode] = useState(""),
        [results, setResults] = useState([]),
        [loading, setLoading] = useState(false),
        [saving, setSaving] = useState(false),
        [error, setError] = useState("");
    const request = useRef(0);
    const user = useSession().data;
    const codes = [
        ...(user?.courses || []),
        ...(user?.readOnly || []),
        ...(user?.previousCourses || []).flatMap((sem) => sem.courses || []),
    ].map((c) => normalizeCourseCode(c.code));
    useEffect(() => {
        if (!open) {
            request.current++;
            setLoading(false);
        }
    }, [open]);
    const search = async (event) => {
        event.preventDefault();
        if (!code.trim() || saving) return;
        const version = ++request.current;
        setLoading(true);
        setError("");
        setResults([]);
        try {
            const data = await GetSearchResult(
                /\d/.test(code) ? [normalizeCourseCode(code)] : code.trim().split(/\s+/),
            );
            if (version !== request.current) return;
            setResults(data.results || []);
            if (!data.results?.length) setError("No results found.");
        } catch {
            if (version === request.current) setError("Courses could not be loaded. Please retry.");
        } finally {
            if (version === request.current) setLoading(false);
        }
    };
    const add = async (course) => {
        if (saving) return;
        setSaving(true);
        setError("");
        try {
            await handleAddCourse(course);
        } catch (failure) {
            setError(failure.message || "Course could not be added.");
        } finally {
            setSaving(false);
        }
    };
    const available = results.filter((c) => !codes.includes(normalizeCourseCode(c.code)));
    return (
        <Dialog
            open={open}
            onOpenChange={onOpenChange}
            title="Add New Course"
            description="Add a course for read-only browsing."
            busy={saving}
            footer={
                <>
                    <Button variant="link" onClick={() => onOpenChange(false)} disabled={saving}>
                        Close
                    </Button>
                    <Button
                        type="submit"
                        form="course-search"
                        disabled={!code.trim()}
                        busy={loading || saving}
                    >
                        Search courses
                    </Button>
                </>
            }
        >
            <form id="course-search" onSubmit={search}>
                <FormField label="Course code or name" error={error}>
                    <input
                        value={code}
                        onChange={(event) => {
                            setCode(event.target.value);
                            request.current++;
                            setLoading(false);
                            setResults([]);
                        }}
                    />
                </FormField>
            </form>
            {loading && <LoadingState title="Loading your courses…" />}
            {results.length > 0 && !available.length && <p role="status">Course already exists.</p>}
            <div className={styles.results}>
                {available.map((course) => (
                    <Button
                        key={course._id || course.code}
                        variant="secondary"
                        onClick={() => add(course)}
                        disabled={saving}
                    >
                        <strong className={styles.code}>{course.code}</strong>
                        <span className={styles.name}>{course.name}</span>
                    </Button>
                ))}
            </div>
        </Dialog>
    );
}
