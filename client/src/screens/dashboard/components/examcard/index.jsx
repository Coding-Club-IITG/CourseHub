import "./styles.scss";
const ExamCard = ({ query, type, name }) => {
    const schedule = query.data?.exams?.[type];
    const next = schedule?.nextExam;
    let value = "-",
        caption = "Schedule unavailable";
    if (query.isPending) caption = "Loading schedule…";
    else if (!query.isError && query.data?.status === "ready") {
        if (schedule?.status === "none") caption = "No exam scheduled";
        else if (schedule?.status === "complete") caption = "Exams finished";
        else if (schedule?.status === "partial") caption = "Dates incomplete";
        else if (next) {
            value =
                next.state === "ongoing" ? "Now" : next.daysUntil === 0 ? "Today" : next.daysUntil;
            caption =
                typeof value === "number" ? `${value === 1 ? "Day" : "Days"} until` : "Next exam";
        }
    }
    return (
        <div
            className="exam-card"
            role="group"
            aria-label={`${name} countdown`}
            data-exam-type={type}
        >
            <div className="ndays">
                <p className={`days ${typeof value === "string" && value !== "-" ? "word" : ""}`}>
                    {value}
                </p>
            </div>
            <div className="exam-name">
                <p className="name">{caption}</p>
                <p className="name">{name}</p>
            </div>
        </div>
    );
};

export default ExamCard;
