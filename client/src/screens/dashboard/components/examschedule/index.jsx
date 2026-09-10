import { useState } from "react";
import Container from "../../../../components/container";
import Space from "../../../../components/space";
import { getColors } from "../../../../utils/colors";
import { capitalise } from "../../../../utils/capitalise";
import formatLongText from "../../../../utils/formatLongText";
import "./styles.scss";

const displayDate = (value) =>
    new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Kolkata",
        day: "numeric",
        month: "short",
        year: "numeric",
    }).format(new Date(value));

const ExamScheduleWidget = ({ query }) => {
    const [activeTab, setActiveTab] = useState("midSem");
    const data = query.data;
    if (data?.status === "excluded") return null;
    const schedule = data?.exams?.[activeTab];
    const label = activeTab === "midSem" ? "Mid-Sem" : "End-Sem";
    const unavailable = data?.status === "unavailable" || schedule?.status === "unavailable";
    const retry = (
        <button
            className="schedule-retry"
            type="button"
            disabled={query.isFetching}
            onClick={() => query.refetch()}
        >
            Try again
        </button>
    );
    return (
        <Container color="dark" className="dashboard-section">
            <section className="exam-schedule-container" aria-label="Exam schedule">
                <div className="schedule-header">
                    <h2>Exam schedule</h2>
                    <div className="schedule-toggle-group" aria-label="Exam type">
                        {["midSem", "endSem"].map((type) => (
                            <button
                                key={type}
                                type="button"
                                className={`toggle-tab ${activeTab === type ? "active" : ""}`}
                                aria-pressed={activeTab === type}
                                onClick={() => setActiveTab(type)}
                            >
                                {type === "midSem" ? "Mid-Sem" : "End-Sem"}
                            </button>
                        ))}
                    </div>
                </div>
                <Space amount={20} />
                {query.isPending ? (
                    <div className="schedule-state-box" role="status">
                        <p className="state-text">Loading exam schedule…</p>
                    </div>
                ) : query.isError ? (
                    <div className="schedule-state-box" role="alert">
                        <p className="state-text">Exam schedule could not be loaded.</p>
                        {retry}
                    </div>
                ) : unavailable ? (
                    <div className="schedule-state-box" role="status">
                        <p className="state-text">
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
                            <div className="schedule-empty-state">
                                <p className="empty-message">
                                    No {label} exams scheduled for your courses.
                                </p>
                                <div className="no-exam-graphic" aria-hidden="true" />
                            </div>
                        )}
                        {schedule?.status === "complete" && (
                            <p className="schedule-complete">
                                All listed {label} exams have finished.
                            </p>
                        )}
                        {!!schedule?.items?.length && (
                            <div className="examcard-list" key={activeTab}>
                                {schedule.items.map((exam, index) => (
                                    <div
                                        key={exam.code}
                                        className="exam-item-card"
                                        style={{
                                            backgroundColor: getColors(index),
                                            animationDelay: `${index * 45}ms`,
                                        }}
                                    >
                                        <div className="card-top">
                                            <span className="course-code">{exam.code}</span>
                                            <span className="slot-pill">Slot {exam.slot}</span>
                                        </div>
                                        <div className="card-middle">
                                            <p className="course-name" title={exam.name}>
                                                {formatLongText(
                                                    capitalise(exam.name || exam.code),
                                                    36,
                                                )}
                                            </p>
                                        </div>
                                        <div className="card-bottom">
                                            <div className="exam-detail-row">
                                                <span className="label">DATE</span>
                                                <time className="value" dateTime={exam.startsAt}>
                                                    {displayDate(exam.startsAt)}
                                                </time>
                                            </div>
                                            <div className="exam-detail-row">
                                                <span className="label">TIME</span>
                                                <span className="value">{exam.time}</span>
                                            </div>
                                            {exam.state !== "upcoming" && (
                                                <p className="exam-state">
                                                    {exam.state === "ongoing"
                                                        ? "In progress"
                                                        : "Finished"}
                                                </p>
                                            )}
                                        </div>
                                    </div>
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
