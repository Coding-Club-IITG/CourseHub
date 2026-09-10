import { FormField } from "@coursehub/ui";
import { FilterButton, ResetFiltersButton } from "../../components/ListControls";
import styles from "@/styles/layout.module.scss";
export default function StudentFilters({ filters, search, setSearch, update, reset }) {
    return (
        <div className={styles.filters}>
            <FormField label="Search students" className={styles.search}>
                <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    maxLength={120}
                    placeholder="Search by name, email or roll number..."
                />
            </FormField>
            <div className={styles.toolbar} role="group" aria-label="Student filter">
                <FilterButton
                    active={!filters.isBR}
                    onClick={() => update({ isBR: false, page: 1 })}
                >
                    All Students
                </FilterButton>
                <FilterButton active={filters.isBR} onClick={() => update({ isBR: true, page: 1 })}>
                    BRs Only
                </FilterButton>
                <ResetFiltersButton onClick={reset} />
            </div>
        </div>
    );
}
