import {
    Button,
    Card,
    CardCode,
    CardDetails,
    CardHeader,
    CardPill,
    CardTitle,
    EmptyState,
} from "@coursehub/ui";
import Container from "../../../../components/container";
import { getColors } from "../../../../utils/colors";
import { capitalise } from "../../../../utils/capitalise";
import styles from "./styles.module.scss";

const displayDate = (value) =>
    new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Kolkata",
        day: "numeric",
        month: "short",
        year: "numeric",
    }).format(new Date(value));

const ExamScheduleWidget = ({ query, activeTab, onTabChange, sectionRef }) => {
    const data = query.data;
    if (data?.status === "excluded") return null;
    const schedule = data?.exams?.[activeTab];
    const label = activeTab === "midSem" ? "Mid-Sem" : "End-Sem";
    const unavailable = data?.status === "unavailable" || schedule?.status === "unavailable";
    const retry = (
        <Button disabled={query.isFetching} onClick={() => query.refetch()}>
            Try again
        </Button>
    );
    return (
        <Container color="dark" className="dashboard-section">
            <section
                id="exam-schedule"
                ref={sectionRef}
                tabIndex={-1}
                className={styles.root}
                aria-label="Exam schedule"
            >
                <div className={styles.header}>
                    <h2>Exam schedule</h2>
                    <div className={styles.toggleGroup} aria-label="Exam type">
                        {["midSem", "endSem"].map((type) => (
                            <button
                                key={type}
                                type="button"
                                className={styles.tab}
                                aria-pressed={activeTab === type}
                                onClick={() => onTabChange(type)}
                            >
                                {type === "midSem" ? "Mid-Sem" : "End-Sem"}
                            </button>
                        ))}
                    </div>
                </div>
                {query.isPending ? (
                    <div className={styles.stateBox} role="status">
                        <p className={styles.stateText}>Loading exam schedule…</p>
                    </div>
                ) : query.isError ? (
                    <div className={styles.stateBox} role="alert">
                        <p className={styles.stateText}>Exam schedule could not be loaded.</p>
                        {retry}
                    </div>
                ) : unavailable ? (
                    <div className={styles.stateBox} role="status">
                        <p className={styles.stateText}>
                            {data?.reason === "REGISTRATION_UNAVAILABLE"
                                ? "Current course registrations are unavailable."
                                : data.status === "ready"
                                  ? `No ${label} exam dates are listed for your courses.`
                                  : `${label} schedule unavailable.`}
                        </p>
                        <p>
                            {data?.reason === "REGISTRATION_UNAVAILABLE"
                                ? "Refresh your courses from Profile, then try again."
                                : "No exam dates are listed here yet. Check the published institute timetable."}
                        </p>
                    </div>
                ) : (
                    <>
                        {schedule?.status === "none" && (
                            <EmptyState
                                plain
                                className={styles.emptyState}
                                title={`No ${label} exams scheduled for your courses.`}
                                illustration={<div className={styles.graphic} aria-hidden="true" />}
                            />
                        )}
                        {schedule?.status === "complete" && (
                            <p className={styles.stateText}>
                                All listed {label} exams have finished.
                            </p>
                        )}
                        {!!schedule?.items?.length && (
                            <div className={styles.list} key={activeTab}>
                                {schedule.items.map((exam, index) => (
                                    <Card
                                        key={exam.code}
                                        interactive
                                        className={`${styles.item} exam-item-card`}
                                        style={{
                                            backgroundColor: getColors(index),
                                            animationDelay: `${index * 45}ms`,
                                        }}
                                    >
                                        <CardHeader>
                                            <CardCode>{exam.code}</CardCode>
                                            <CardPill>Slot {exam.slot}</CardPill>
                                        </CardHeader>
                                        <CardTitle lines={2} title={exam.name}>
                                            {capitalise(exam.name || exam.code)}
                                        </CardTitle>
                                        <CardDetails
                                            items={[
                                                [
                                                    "Date",
                                                    <time key="d" dateTime={exam.startsAt}>
                                                        {displayDate(exam.startsAt)}
                                                    </time>,
                                                ],
                                                ["Time", exam.time],
                                            ]}
                                        />
                                        {exam.state !== "upcoming" && (
                                            <p className={styles.itemState}>
                                                {exam.state === "ongoing"
                                                    ? "In progress"
                                                    : "Finished"}
                                            </p>
                                        )}
                                    </Card>
                                ))}
                            </div>
                        )}
                    </>
                )}
            </section>
        </Container>
    );
};
export default ExamScheduleWidget;
