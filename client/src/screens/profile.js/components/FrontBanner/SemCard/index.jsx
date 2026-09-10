import styles from "./styles.module.scss";
export default function SemCard({ sem }) {
    return (
        <div className={styles.card}>
            <strong>{sem}</strong>
            <span>Semester</span>
        </div>
    );
}
