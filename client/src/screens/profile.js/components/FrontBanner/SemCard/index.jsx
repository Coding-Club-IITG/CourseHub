import { Card } from "@coursehub/ui";
import styles from "./styles.module.scss";
export default function SemCard({ sem }) {
    return (
        <Card tone="bare" className={styles.card}>
            <strong>{sem}</strong>
            <span>Semester</span>
        </Card>
    );
}
