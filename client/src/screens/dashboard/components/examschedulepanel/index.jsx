import { useEffect, useMemo, useRef, useState } from "react";

import { createPortal } from "react-dom";

import { useSelector } from "react-redux";

import { getExamScheduleForCourses, isUserExcluded } from "../../../../utils/examSchedule";

import { getColors } from "../../../../utils/colors";

import "./styles.scss";

const getExamDateParts = (dateString) => {
    if (!dateString) return { weekday: "", day: "", month: "" };

    const [day, month, year] = dateString.split("-").map(Number);

    const date = new Date(year, month - 1, day);

    if (Number.isNaN(date.getTime())) {
        return {
            weekday: "",
            day: dateString,
            month: "",
        };
    }

    return {
        weekday: date.toLocaleDateString("en-GB", {
            weekday: "short",
        }),
        day: date.toLocaleDateString("en-GB", {
            day: "numeric",
        }),
        month: date.toLocaleDateString("en-GB", {
            month: "short",
        }),
    };
};

const formatDateRange = (exams) => {
    if (!exams.length) return "No dates yet";

    const firstDate = new Date(exams[0].timestamp);
    const lastDate = new Date(exams[exams.length - 1].timestamp);

    const formatOptions = {
        day: "numeric",
        month: "short",
    };

    if (firstDate.toDateString() === lastDate.toDateString()) {
        return firstDate.toLocaleDateString("en-GB", formatOptions);
    }

    const firstDay = firstDate.toLocaleDateString("en-GB", {
        day: "numeric",
    });

    const lastDay = lastDate.toLocaleDateString("en-GB", {
        day: "numeric",
    });

    const firstMonth = firstDate.toLocaleDateString("en-GB", {
        month: "short",
    });

    const lastMonth = lastDate.toLocaleDateString("en-GB", {
        month: "short",
    });

    return firstMonth === lastMonth
        ? `${firstDay}–${lastDay} ${lastMonth}`
        : `${firstDay} ${firstMonth} – ${lastDay} ${lastMonth}`;
};

const formatTwentyFourHourTime = (timeString) => {
    const [hoursString, minutes = "00"] = timeString.trim().split(":");

    const hours = Number(hoursString);
    const parsedMinutes = Number(minutes);

    if (Number.isNaN(hours) || Number.isNaN(parsedMinutes)) {
        return timeString;
    }

    return `${String(hours).padStart(2, "0")}:${String(parsedMinutes).padStart(2, "0")}`;
};

const formatExamTime = (timeRange) => {
    if (!timeRange || !timeRange.includes("-")) {
        return timeRange || "Time TBA";
    }

    const [startTime, endTime] = timeRange.split("-");

    return `${formatTwentyFourHourTime(startTime)} – ${formatTwentyFourHourTime(endTime)}`;
};

const getExamDuration = (timeRange) => {
    if (!timeRange || !timeRange.includes("-")) return "";

    const toMinutes = (timeString) => {
        const [hours, minutes = "0"] = timeString.trim().split(":").map(Number);

        return Number.isNaN(hours) || Number.isNaN(minutes) ? null : hours * 60 + minutes;
    };

    const [startTime, endTime] = timeRange.split("-");

    const startMinutes = toMinutes(startTime);
    const endMinutes = toMinutes(endTime);

    if (startMinutes === null || endMinutes === null || endMinutes <= startMinutes) {
        return "";
    }

    const duration = endMinutes - startMinutes;

    const hours = Math.floor(duration / 60);
    const minutes = duration % 60;

    if (!minutes) {
        return `${hours} hr${hours === 1 ? "" : "s"}`;
    }

    if (!hours) {
        return `${minutes} min`;
    }

    return `${hours} hr ${minutes} min`;
};

const getPreparationNote = (exam, nextExam) => {
    if (!nextExam) return null;

    const [day1, month1, year1] = exam.date.split("-").map(Number);

    const [day2, month2, year2] = nextExam.date.split("-").map(Number);

    const currentDate = new Date(year1, month1 - 1, day1);

    const nextDate = new Date(year2, month2 - 1, day2);

    const daysBetween = Math.round((nextDate - currentDate) / (1000 * 60 * 60 * 24));

    if (daysBetween === 0) {
        return "Same day";
    }

    if (daysBetween === 1) {
        return "Back-to-back days";
    }

    const preparationDays = daysBetween - 1;

    if (preparationDays === 1) {
        return "1 day to prepare";
    }

    return `${preparationDays} days to prepare`;
};

const ExamSchedulePanel = ({ midSemDays, endSemDays }) => {
    const currentUser = useSelector((state) => state.user?.user);

    const isExcluded = useMemo(() => isUserExcluded(currentUser), [currentUser]);

    const triggerRef = useRef(null);
    const closeButtonRef = useRef(null);

    const [isOpen, setIsOpen] = useState(false);

    const [activeTab, setActiveTab] = useState(midSemDays >= 0 ? "midSem" : "endSem");

    // Load both schedules up front so each tab can show its own count and date range.
    const examsByTab = useMemo(() => {
        if (!currentUser || isExcluded) {
            return { midSem: [], endSem: [] };
        }

        const registeredCourses = Array.isArray(currentUser.courses) ? currentUser.courses : [];

        return {
            midSem: getExamScheduleForCourses(registeredCourses, undefined, "midSem"),
            endSem: getExamScheduleForCourses(registeredCourses, undefined, "endSem"),
        };
    }, [currentUser, isExcluded]);

    // Exams for the tab that is currently open.
    const scheduledExams = examsByTab[activeTab];

    // The single next upcoming exam across both schedules, so "Next" shows only once.
    const nextExam = useMemo(() => {
        const now = Date.now();

        return [...examsByTab.midSem, ...examsByTab.endSem]
            .filter((exam) => exam.timestamp > now)
            .sort((a, b) => a.timestamp - b.timestamp)[0];
    }, [examsByTab]);

    // Today's date, shown on the header tile.
    const today = new Date();

    const headerDate = {
        month: today.toLocaleDateString("en-GB", { month: "short" }),
        day: today.toLocaleDateString("en-GB", { day: "numeric" }),
    };

    useEffect(() => {
        const midSemExams = examsByTab.midSem;

        if (midSemExams.length === 0) {
            return;
        }

        const lastMidSemExam = midSemExams[midSemExams.length - 1];

        const today = new Date();
        const lastMidSemDate = new Date(lastMidSemExam.timestamp);

        // Compare calendar dates only, ignoring time.
        today.setHours(0, 0, 0, 0);
        lastMidSemDate.setHours(0, 0, 0, 0);

        if (today > lastMidSemDate) {
            setActiveTab("endSem");
        } else {
            setActiveTab("midSem");
        }
    }, [examsByTab]);

    useEffect(() => {
        if (!isOpen) return undefined;

        const previousOverflow = document.body.style.overflow;

        const handleKeyDown = (event) => {
            if (event.key === "Escape") {
                setIsOpen(false);
            }
        };

        document.body.style.overflow = "hidden";

        document.addEventListener("keydown", handleKeyDown);

        closeButtonRef.current?.focus();

        return () => {
            document.body.style.overflow = previousOverflow;

            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [isOpen]);

    const closePanel = () => {
        setIsOpen(false);

        window.setTimeout(() => triggerRef.current?.focus(), 0);
    };

    const handleOverlayClick = (event) => {
        if (event.target === event.currentTarget) {
            closePanel();
        }
    };

    if (isExcluded || typeof document === "undefined") {
        return null;
    }

    return createPortal(
        <>
            {/* Outer button = fixed hit area (never transformed). Inner tag = the visual that moves. */}
            <button
                ref={triggerRef}
                className="exam-schedule-bookmark"
                type="button"
                onClick={() => setIsOpen(true)}
                aria-haspopup="dialog"
                aria-expanded={isOpen}
            >
                <span className="exam-schedule-bookmark__tag">Exams</span>
            </button>

            {isOpen && (
                <div className="exam-schedule-overlay" onClick={handleOverlayClick}>
                    <aside
                        className="exam-schedule-panel"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="exam-schedule-panel-title"
                    >
                        <header className="exam-schedule-panel__header">
                            <span className="exam-schedule-panel__header-icon" aria-hidden="true">
                                <small>{headerDate.month}</small>

                                <strong>{headerDate.day}</strong>
                            </span>

                            <h2 id="exam-schedule-panel-title">Exam Schedule</h2>

                            <button
                                ref={closeButtonRef}
                                className="exam-schedule-panel__close"
                                type="button"
                                onClick={closePanel}
                                aria-label="Close exam schedule"
                            >
                                <svg
                                    width="18"
                                    height="18"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    aria-hidden="true"
                                >
                                    <path d="M6 6l12 12M18 6L6 18" />
                                </svg>
                            </button>
                        </header>

                        <div
                            className="exam-schedule-panel__tabs"
                            role="tablist"
                            aria-label="Exam type"
                        >
                            {["midSem", "endSem"].map((tab) => {
                                const isActive = activeTab === tab;

                                const tabExams = examsByTab[tab];

                                const tabLabel = tab === "midSem" ? "Midsem" : "Endsem";

                                return (
                                    <button
                                        key={tab}
                                        type="button"
                                        role="tab"
                                        aria-selected={isActive}
                                        className={isActive ? "is-active" : ""}
                                        onClick={() => setActiveTab(tab)}
                                    >
                                        <span>
                                            <strong>
                                                {tabLabel} · {tabExams.length}
                                            </strong>
                                        </span>

                                        <small>{formatDateRange(tabExams)}</small>
                                    </button>
                                );
                            })}
                        </div>

                        <div className="exam-schedule-panel__content" role="tabpanel">
                            {scheduledExams.length > 0 ? (
                                <ul className="exam-schedule-panel__list">
                                    {scheduledExams.map((exam, index) => {
                                        const date = getExamDateParts(exam.date);

                                        const duration = getExamDuration(exam.time);

                                        const isNext =
                                            exam.code === nextExam?.code &&
                                            exam.timestamp === nextExam?.timestamp;

                                        const preparationNote = getPreparationNote(
                                            exam,
                                            scheduledExams[index + 1],
                                        );

                                        return (
                                            <li key={`${activeTab}-${exam.code}`}>
                                                <article
                                                    className={`exam-schedule-panel__exam-card ${
                                                        isNext ? "is-next" : ""
                                                    }`}
                                                >
                                                    <time
                                                        className="exam-schedule-panel__date-tile"
                                                        dateTime={exam.date}
                                                        style={{
                                                            backgroundColor: getColors(index),
                                                        }}
                                                    >
                                                        <span>{date.weekday}</span>

                                                        <strong>{date.day}</strong>

                                                        <small>{date.month}</small>
                                                    </time>

                                                    <div className="exam-schedule-panel__exam-details">
                                                        <div className="exam-schedule-panel__course-meta">
                                                            <span className="exam-schedule-panel__code">
                                                                {exam.code}
                                                            </span>

                                                            <span className="exam-schedule-panel__slot">
                                                                Slot {exam.slot}
                                                            </span>
                                                        </div>

                                                        <p className="exam-schedule-panel__course-name">
                                                            {exam.name || exam.code}
                                                        </p>

                                                        <p className="exam-schedule-panel__time">
                                                            <span aria-hidden="true">◷</span>

                                                            {formatExamTime(exam.time)}

                                                            {duration && <span> · {duration}</span>}
                                                        </p>
                                                    </div>

                                                    {isNext && (
                                                        <span className="exam-schedule-panel__next">
                                                            Next
                                                        </span>
                                                    )}
                                                </article>

                                                {preparationNote && (
                                                    <p className="exam-schedule-panel__preparation-note">
                                                        {preparationNote}
                                                    </p>
                                                )}
                                            </li>
                                        );
                                    })}
                                </ul>
                            ) : (
                                <p className="exam-schedule-panel__empty">
                                    No {activeTab === "midSem" ? "Midsem" : "Endsem"} data found.
                                </p>
                            )}
                        </div>

                        <footer className="exam-schedule-panel__footer">
                            <p>
                                <span aria-hidden="true">ⓘ</span>
                                Remember to take your institue ID card to the exam hall.
                            </p>
                        </footer>
                    </aside>
                </div>
            )}
        </>,
        document.body,
    );
};

export default ExamSchedulePanel;
