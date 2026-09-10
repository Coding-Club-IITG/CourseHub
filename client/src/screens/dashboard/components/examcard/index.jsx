import { Card } from "@coursehub/ui";
import styles from "./styles.module.scss";
const ExamCard = ({ query, type, name }) => {
    const schedule = query.data?.exams?.[type];
    const next = schedule?.nextExam;
    let value = "-",
        caption = "Schedule unavailable";
    if (query.isPending) caption = "Loading schedule…";
    else if (!query.isError && query.data?.status === "ready") {
        if (schedule?.status === "none") caption = "No exam scheduled";
        else if (schedule?.status === "complete") caption = "Exams finished";
        else if (schedule?.status === "partial") caption = "Listed exams";
        else if (schedule?.status === "unavailable") caption = "No dates listed";
        else if (next) {
            value =
                next.state === "ongoing" ? "Now" : next.daysUntil === 0 ? "Today" : next.daysUntil;
            caption =
                typeof value === "number" ? `${value === 1 ? "Day" : "Days"} until` : "Next exam";
        }
    }
    return (
        <Card
            interactive
            className={`${styles.card} exam-card`}
            role="group"
            aria-label={`${name} countdown`}
            data-exam-type={type}
        >
            <p
                className={`${styles.value} days`}
                data-word={typeof value === "string" && value !== "-"}
            >
                {value}
            </p>
            <div className={styles.caption}>
                <p>{caption}</p>
                <p>{name}</p>
            </div>
        </Card>
    );
};

export default ExamCard;
