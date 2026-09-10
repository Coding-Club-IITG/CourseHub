import { Button, FormField } from "@coursehub/ui";
import styles from "@/styles/layout.module.scss";
export default function CourseFilters({ filters, search, setSearch, update, reset }) {
    return (
        <div className={styles.filters}>
            <FormField label="Search courses" className={styles.search}>
                <input
                    value={search}
                    maxLength={120}
                    placeholder="Search by course code or name..."
                    onChange={(event) => setSearch(event.target.value)}
                />
            </FormField>
            <div className={styles.toolbar} role="group" aria-label="Course filters">
                {[
                    ["nameless", "Without names"],
                    ["duplicates", "Duplicate codes"],
                ].map(([key, label]) => (
                    <Button
                        key={key}
                        variant={filters[key] ? "primary" : "secondary"}
                        aria-pressed={filters[key]}
                        onClick={() => update({ [key]: !filters[key], page: 1 })}
                    >
                        {label}
                    </Button>
                ))}
                <Button variant="link" onClick={reset}>
                    Reset filters
                </Button>
            </div>
        </div>
    );
}
