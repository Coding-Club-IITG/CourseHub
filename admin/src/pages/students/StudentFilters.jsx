import { Button, Icon, FormField } from "@coursehub/ui";
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
                <Button
                    variant={filters.isBR ? "secondary" : "primary"}
                    aria-pressed={!filters.isBR}
                    onClick={() => update({ isBR: false, page: 1 })}
                >
                    All Students
                </Button>
                <Button
                    variant={filters.isBR ? "primary" : "secondary"}
                    aria-pressed={filters.isBR}
                    onClick={() => update({ isBR: true, page: 1 })}
                >
                    BRs Only
                </Button>
                <Button variant="link" onClick={reset}>
                    <Icon name="refresh" /> Reset filters
                </Button>
            </div>
        </div>
    );
}
