import { FormField } from "@coursehub/ui";
import { FilterButton, ResetFiltersButton } from "../../components/ListControls";
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
                    ["withoutBR", "Without BR"],
                ].map(([key, label]) => (
                    <FilterButton
                        key={key}
                        active={filters[key]}
                        onClick={() => update({ [key]: !filters[key], page: 1 })}
                    >
                        {label}
                    </FilterButton>
                ))}
                <ResetFiltersButton onClick={reset} />
            </div>
            {filters.withoutBR && (
                <p className={styles.muted}>
                    Courses without a registered BR with a current or historical course allotment.
                </p>
            )}
        </div>
    );
}
