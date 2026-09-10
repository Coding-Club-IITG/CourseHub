import styles from "@/styles/layout.module.scss";
export function Table({ className = "", ...props }) {
    return (
        <div
            className={styles.scroll}
            data-slot="table-container"
            tabIndex={0}
            role="region"
            aria-label="Scrollable table"
        >
            <table className={`${styles.table} ${className}`} {...props} />
        </div>
    );
}
export function TableHeader({ className = "", ...props }) {
    return <thead className={`${styles.tableHead} ${className}`} {...props} />;
}
export function TableBody(props) {
    return <tbody {...props} />;
}
export function TableFooter(props) {
    return <tfoot {...props} />;
}
export function TableRow({ className = "", ...props }) {
    return <tr className={`${styles.row} ${className}`} {...props} />;
}
export function TableHead({ className = "", ...props }) {
    return <th scope="col" className={`${styles.cell} ${className}`} {...props} />;
}
export function TableCell({ className = "", ...props }) {
    return <td className={`${styles.cell} ${className}`} {...props} />;
}
export function TableCaption(props) {
    return <caption {...props} />;
}
