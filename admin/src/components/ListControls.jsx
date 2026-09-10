import { Button, Icon } from "@coursehub/ui";

export function FilterButton({ active, ...props }) {
    return <Button variant={active ? "primary" : "secondary"} aria-pressed={active} {...props} />;
}

export function RefreshButton({ children = "Refresh", busy, ...props }) {
    return (
        <Button variant="secondary" busy={busy} busyLabel="Refreshing…" {...props}>
            {!busy && <Icon name="refresh" />}
            {children}
        </Button>
    );
}

export function ResetFiltersButton(props) {
    return (
        <RefreshButton variant="link" {...props}>
            Reset filters
        </RefreshButton>
    );
}
