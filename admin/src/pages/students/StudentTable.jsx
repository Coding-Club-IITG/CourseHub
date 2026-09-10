import { Fragment } from "react";
import { Badge, IconButton, Icon } from "@coursehub/ui";
import {
    Table,
    TableHeader,
    TableBody,
    TableRow,
    TableCell,
    TableHead,
} from "../../components/ui/table";
import StudentDetails from "./StudentDetails";
import styles from "./styles.module.scss";
export default function StudentTable({ items, expanded, onExpand, onAction }) {
    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Roll number</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Degree / Semester</TableHead>
                    <TableHead>BR access</TableHead>
                    <TableHead>Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {items.map((item) => (
                    <Fragment key={item._id}>
                        <TableRow>
                            <TableCell>{item.isRegistered ? item.rollNumber : "Pending"}</TableCell>
                            <TableCell>{item.name}</TableCell>
                            <TableCell>{item.email}</TableCell>
                            <TableCell>
                                {item.isRegistered
                                    ? `${item.degree} / ${item.semester}`
                                    : "Awaiting registration"}
                            </TableCell>
                            <TableCell>
                                <Badge
                                    className={styles.access}
                                    tone={item.isBR ? "success" : "neutral"}
                                >
                                    {item.isBR ? "BR" : "Student"}
                                </Badge>
                            </TableCell>
                            <TableCell>
                                <div className={styles.actions}>
                                    {item.isRegistered && (
                                        <>
                                            <IconButton
                                                size="sm"
                                                variant="secondary"
                                                label={
                                                    expanded === item._id
                                                        ? "Hide details"
                                                        : "Details"
                                                }
                                                aria-expanded={expanded === item._id}
                                                aria-controls={"student-" + item._id}
                                                onClick={() => onExpand(item._id)}
                                            >
                                                <Icon
                                                    name={expanded === item._id ? "close" : "info"}
                                                />
                                            </IconButton>
                                            <IconButton
                                                size="sm"
                                                variant="secondary"
                                                label="Refresh courses"
                                                onClick={() => onAction({ type: "refresh", item })}
                                            >
                                                <Icon name="refresh" />
                                            </IconButton>
                                            <IconButton
                                                size="sm"
                                                variant="secondary"
                                                label="Delete student"
                                                onClick={() => onAction({ type: "delete", item })}
                                            >
                                                <Icon name="trash" />
                                            </IconButton>
                                        </>
                                    )}
                                    {item.isBR && (
                                        <IconButton
                                            size="sm"
                                            variant="secondary"
                                            label="Remove BR"
                                            onClick={() => onAction({ type: "remove-br", item })}
                                        >
                                            <Icon name="userMinus" />
                                        </IconButton>
                                    )}
                                </div>
                            </TableCell>
                        </TableRow>
                        {expanded === item._id && item.isRegistered && (
                            <TableRow>
                                <TableCell colSpan={6}>
                                    <div id={"student-" + item._id}>
                                        <StudentDetails id={item._id} />
                                    </div>
                                </TableCell>
                            </TableRow>
                        )}
                    </Fragment>
                ))}
            </TableBody>
        </Table>
    );
}
