import { useId, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@coursehub/browser";
import { Button, FormField } from "@coursehub/ui";
import { GetSearchResult } from "../../../../api/Search";
import { library } from "../../../../session/runtime";
import { normalizeCourseCode } from "@coursehub/domain";
import styles from "./styles.module.scss";
export default function SearchBar() {
    const [value, setValue] = useState(""),
        [submitted, setSubmitted] = useState(""),
        [open, setOpen] = useState(false),
        id = useId();
    const query = useQuery({
        queryKey: library.key("search", submitted),
        enabled: !!submitted && open,
        queryFn: ({ signal }) =>
            GetSearchResult(
                /\d/.test(submitted) ? [normalizeCourseCode(submitted)] : submitted.split(/\s+/),
                signal,
            ),
        retry: false,
    });
    const results = query.data?.results || [];
    return (
        <div
            className={styles.search}
            onKeyDown={(event) => {
                if (event.key === "Escape") setOpen(false);
            }}
            onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
            }}
        >
            <form
                onSubmit={(event) => {
                    event.preventDefault();
                    setSubmitted(value.trim());
                    setOpen(true);
                }}
            >
                <FormField label="Search courses">
                    <input
                        value={value}
                        placeholder="Search Courses"
                        aria-controls={open ? id : undefined}
                        onChange={(event) => {
                            setValue(event.target.value);
                            setSubmitted("");
                            setOpen(false);
                        }}
                    />
                </FormField>
                <Button type="submit" aria-label="Search courses" disabled={!value.trim()}>
                    Search
                </Button>
            </form>
            {open && submitted && (
                <div className={styles.results} id={id}>
                    {query.isPending ? (
                        <p role="status">Searching…</p>
                    ) : query.isError ? (
                        <p role="alert">
                            Courses could not be loaded.{" "}
                            <Button variant="link" onClick={() => query.refetch()}>
                                Try again
                            </Button>
                        </p>
                    ) : results.length ? (
                        results.map((item) => (
                            <Link
                                key={item._id || item.code}
                                onClick={() => setOpen(false)}
                                to={"/browse/" + normalizeCourseCode(item.code)}
                            >
                                <strong>{item.code}</strong> {item.name}
                            </Link>
                        ))
                    ) : (
                        <p>No courses found.</p>
                    )}
                    <Button variant="link" onClick={() => setOpen(false)}>
                        Close search
                    </Button>
                </div>
            )}
        </div>
    );
}
