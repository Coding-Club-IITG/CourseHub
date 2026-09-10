import { useEffect, useId, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@coursehub/browser";
import { Button, Icon } from "@coursehub/ui";
import { GetSearchResult } from "../../../../api/Search";
import { library } from "../../../../session/runtime";
import { normalizeCourseCode } from "@coursehub/domain";
import styles from "./styles.module.scss";
export default function SearchBar() {
    const [value, setValue] = useState(""),
        [submitted, setSubmitted] = useState(""),
        [open, setOpen] = useState(false),
        id = useId();
    const term = value.trim();
    useEffect(() => {
        const timer = setTimeout(() => setSubmitted(term), 250);
        return () => clearTimeout(timer);
    }, [term]);
    const query = useQuery({
        queryKey: library.key("search", submitted),
        enabled: !!submitted && submitted === term && open,
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
                <label className={styles.field}>
                    <Icon name="search" />
                    <input
                        aria-label="Search courses"
                        value={value}
                        placeholder="Search Courses"
                        aria-controls={open ? id : undefined}
                        onChange={(event) => {
                            setValue(event.target.value);
                            setOpen(true);
                        }}
                        onFocus={() => {
                            if (term) setOpen(true);
                        }}
                    />
                </label>
            </form>
            {open && term && (
                <div className={styles.results} id={id}>
                    {submitted !== term || query.isPending ? (
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
