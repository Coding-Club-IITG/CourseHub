import workflow from "../styles/workflows.module.scss";
import { Link } from "react-router-dom";
import { EmptyState } from "@coursehub/ui";
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from "./ui/table";
import styles from "../styles/layout.module.scss";
export default function CoursesWithoutBRTable({ courses }) {
    if (!courses.length)
        return (
            <EmptyState title="No courses found">
                <p>No uncovered courses match your search.</p>
            </EmptyState>
        );
    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Name</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {courses.map((course) => (
                    <TableRow key={course._id || course.code}>
                        <TableCell>
                            <Link
                                className={`${styles.link} ${workflow.courseCode}`}
                                to={`/admin/courses/${encodeURIComponent(course.code)}`}
                            >
                                {course.code}
                            </Link>
                        </TableCell>
                        <TableCell>{course.name}</TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
}
