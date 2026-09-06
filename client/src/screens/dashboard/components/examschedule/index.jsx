import React, { useState, useEffect, useMemo } from "react";
import { useSelector } from "react-redux";
import Container from "../../../../components/container";
import SubHeading from "../../../../components/subheading";
import Space from "../../../../components/space";
import { isUserExcluded, getExamScheduleForCourses } from "../../../../utils/examSchedule";
import { getColors } from "../../../../utils/colors";
import { capitalise } from "../../../../utils/capitalise";
import formatLongText from "../../../../utils/formatLongText";
import "./styles.scss";

/**
 * Format a DD-MM-YYYY string into a clean readable format, e.g. "14 Sep 2026"
 */
function formatDisplayDate(dateStr) {
    if (!dateStr) return "";
    const parts = dateStr.split("-").map(Number);
    if (parts.length !== 3) return dateStr;
    const [day, month, year] = parts;
    const dateObj = new Date(year, month - 1, day);
    if (isNaN(dateObj.getTime())) return dateStr;
    return dateObj.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
    });
}

const ExamScheduleWidget = () => {
    const userState = useSelector((state) => state.user);
    const currentUser = userState?.user;

    const [activeTab, setActiveTab] = useState("midSem"); // "midSem" | "endSem"
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);

    // Business Rule: Exclude B.Tech Semester 1 and Semester 2 users completely (return null)
    const isExcluded = useMemo(() => isUserExcluded(currentUser), [currentUser]);

    useEffect(() => {
        if (isExcluded) {
            setIsLoading(false);
            return;
        }

        try {
            setIsLoading(false);
            setHasError(false);
        } catch (err) {
            setHasError(true);
            setIsLoading(false);
        }
    }, [currentUser, isExcluded]);

    // Cross-reference user's registered courses with exam schedule
    const scheduledExams = useMemo(() => {
        if (!currentUser || isExcluded) return [];
        const registeredCourses = Array.isArray(currentUser.courses) ? currentUser.courses : [];
        return getExamScheduleForCourses(registeredCourses, undefined, activeTab);
    }, [currentUser, isExcluded, activeTab]);

    // If user is B.Tech Sem 1 or 2, return null per specification (not an empty state)
    if (isExcluded) {
        return null;
    }

    return (
        <Container>
            <div className="exam-schedule-container">
                <div className="schedule-header">
                    <SubHeading text={"EXAM SCHEDULE"} type={"bold"} algn={"center"} />

                    <div className="schedule-toggle-group">
                        <div
                            className={`toggle-tab ${activeTab === "midSem" ? "active" : ""}`}
                            onClick={() => setActiveTab("midSem")}
                        >
                            Mid-Sem
                        </div>
                        <div
                            className={`toggle-tab ${activeTab === "endSem" ? "active" : ""}`}
                            onClick={() => setActiveTab("endSem")}
                        >
                            End-Sem
                        </div>
                    </div>
                </div>

                <Space amount={20} />

                {/* State 1: Loading */}
                {isLoading && (
                    <div className="schedule-state-box">
                        <p className="state-text">Loading exam schedule...</p>
                    </div>
                )}

                {/* State 2: Error */}
                {!isLoading && hasError && (
                    <div className="schedule-state-box">
                        <p className="state-text error">Failed to load exam schedule.</p>
                    </div>
                )}

                {/* State 3: Empty state (registered courses exist, but none scheduled yet) */}
                {!isLoading && !hasError && scheduledExams.length === 0 && (
                    <div className="schedule-empty-state">
                        <p className="empty-message">No {activeTab === "midSem" ? "Mid-Sem" : "End-Sem"} exams scheduled for your courses.</p>
                        <div className="no-exam-graphic"></div>
                    </div>
                )}

                {/* State 4: Populated chronological schedule */}
                {!isLoading && !hasError && scheduledExams.length > 0 && (
                    <div className="examcard-list" key={activeTab}>
                        {scheduledExams.map((exam, index) => (
                            <div
                                key={`${exam.code}-${exam.examType}`}
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
                                    <p className="course-name">
                                        {formatLongText(capitalise(exam.name || exam.code), 36)}
                                    </p>
                                </div>

                                <div className="card-bottom">
                                    <div className="exam-detail-row">
                                        <span className="label">DATE</span>
                                        <span className="value">{formatDisplayDate(exam.date)}</span>
                                    </div>
                                    <div className="exam-detail-row">
                                        <span className="label">TIME</span>
                                        <span className="value">{exam.time}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </Container>
    );
};

export default ExamScheduleWidget;
