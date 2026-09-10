import { Card } from "@coursehub/ui";
import styles from "./styles.module.scss";
const ExamCard = ({ next, type, name, onSelect }) => {
    const value =
        next.state === "ongoing" ? "Now" : next.daysUntil === 0 ? "Today" : next.daysUntil;
    const caption = typeof value === "number" ? `${value === 1 ? "Day" : "Days"} for` : null;
    return (
        <Card
            as="button"
            type="button"
            interactive
            className={`${styles.card} exam-card`}
            aria-label={`${name} countdown`}
            aria-controls="exam-schedule"
            onClick={() => onSelect(type)}
            data-exam-type={type}
        >
            <p className={`${styles.value} days`} data-word={typeof value === "string"}>
                {value}
            </p>
            <div className={styles.caption}>
                {caption && <p>{caption}</p>}
                <p>{name}</p>
            </div>
        </Card>
    );
};

export default ExamCard;
