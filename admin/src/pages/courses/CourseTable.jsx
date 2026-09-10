import { Link } from "react-router-dom";
import { Button, Badge } from "@coursehub/ui";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "../../components/ui/table";
import styles from "./styles.module.scss";
export default function CourseTable({ items, onEdit, onDelete }) {
    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Course code</TableHead>
                    <TableHead>Course name</TableHead>
                    <TableHead>Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {items.map((item) => (
                    <TableRow key={item._id || item.code}>
                        <TableCell>
                            <strong>{item.code}</strong>
                            {item.duplicate && <Badge tone="warning">Duplicate code</Badge>}
                        </TableCell>
                        <TableCell>
                            {item.name || "Name Unavailable"}
                            {(item.changingOperation || item.deletingOperation) && (
                                <Badge>Change in progress</Badge>
                            )}
                        </TableCell>
                        <TableCell>
                            <div className={styles.actions}>
                                <Link to={`/admin/courses/${encodeURIComponent(item.code)}`}>
                                    View
                                </Link>
                                <Button
                                    variant="secondary"
                                    title="Edit course code and name"
                                    onClick={() => onEdit(item)}
                                >
                                    Edit
                                </Button>
                                <Button
                                    variant="secondary"
                                    title="Delete course"
                                    onClick={() => onDelete(item)}
                                >
                                    Delete
                                </Button>
                            </div>
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
}
