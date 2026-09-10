import { Link } from "react-router-dom";
import { IconButton, Icon, Badge } from "@coursehub/ui";
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
                                <Link
                                    aria-label="View"
                                    title="View course"
                                    to={`/admin/courses/${encodeURIComponent(item.code)}`}
                                >
                                    <Icon name="eye" />
                                </Link>
                                <IconButton
                                    size="sm"
                                    variant="secondary"
                                    label="Edit"
                                    title="Edit course code and name"
                                    onClick={() => onEdit(item)}
                                >
                                    <Icon name="edit" />
                                </IconButton>
                                <IconButton
                                    size="sm"
                                    variant="secondary"
                                    label="Delete"
                                    title="Delete course"
                                    onClick={() => onDelete(item)}
                                >
                                    <Icon name="trash" />
                                </IconButton>
                            </div>
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
}
