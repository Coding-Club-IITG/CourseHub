import defaultScheduleData from "../data/examScheduleData.js";

/**
 * Parses a DD-MM-YYYY date string and an optional HH:mm-HH:mm time range into a Date object.
 * @param {string} dateStr e.g. "13-09-2026"
 * @param {string} timeStr e.g. "9:00-11:00"
 * @returns {Date}
 */
export function parseExamDateTime(dateStr, timeStr = "00:00") {
    if (!dateStr) return new Date(0);
    const parts = dateStr.split("-").map((p) => parseInt(p, 10));
    if (parts.length !== 3 || parts.some(isNaN)) return new Date(0);
    const [day, month, year] = parts;

    const startTime = (timeStr || "").split("-")[0].trim();
    const timeParts = startTime.split(":").map((p) => parseInt(p, 10));
    const hours = !isNaN(timeParts[0]) ? timeParts[0] : 0;
    const minutes = !isNaN(timeParts[1]) ? timeParts[1] : 0;

    return new Date(year, month - 1, day, hours, minutes);
}

/**
 * Checks if the user is excluded from seeing the Exam Schedule widget.
 * Exclusion rule: B.Tech Semester 1 and Semester 2 users do not receive the widget.
 * @param {Object} user 
 * @returns {boolean}
 */
export function isUserExcluded(user) {
    if (!user) return false;
    const degreeRaw = (user.degree || user.programme || user.program || "").toLowerCase().replace(/[\s.-]/g, "");
    const isBTech = degreeRaw === "btech";
    const semester = Number(user.semester);
    return isBTech && (semester === 1 || semester === 2);
}

/**
 * Cross-references a list of registered courses with the exam slot and schedule database.
 * Drops courses without matching exams silently (flagged in QA comment) and sorts chronologically.
 * 
 * @param {Array<Object|string>} courses - List of courses (either { code, name } objects or code strings)
 * @param {Object} scheduleData - The slot & schedule mapping database
 * @param {"midSem"|"endSem"} examType - Which exam schedule to lookup
 * @returns {Array<Object>} Sorted list of scheduled exams
 */
export function getExamScheduleForCourses(courses = [], scheduleData = defaultScheduleData, examType = "midSem") {
    if (!Array.isArray(courses) || !scheduleData) return [];

    const { courseSlotMap = {}, slotSchedule = {} } = scheduleData;
    const scheduledExams = [];

    for (const course of courses) {
        const rawCode = typeof course === "string" ? course : course?.code;
        if (!rawCode) continue;

        const normalizedCode = rawCode.trim().replace(/\s+/g, "").toUpperCase();
        const slot = courseSlotMap[normalizedCode];

        /*
         * QA NOTE / BUSINESS RULE:
         * If a registered course code has no slot mapped or the slot is not found in the
         * exam schedule, it is dropped silently from the user's view (no broken row rendered).
         */
        if (!slot || !slotSchedule[slot] || !slotSchedule[slot][examType]) {
            // QA Flag: Course "${normalizedCode}" has no registered exam schedule for ${examType}.
            continue;
        }

        const examInfo = slotSchedule[slot][examType];
        const courseName = (typeof course === "object" && course?.name) ? course.name : normalizedCode;

        scheduledExams.push({
            code: normalizedCode,
            name: courseName,
            slot,
            examType,
            date: examInfo.date,
            time: examInfo.time,
            rawSchedule: examInfo.raw,
            timestamp: parseExamDateTime(examInfo.date, examInfo.time).getTime(),
        });
    }

    // Chronological sorting by date and start time
    return scheduledExams.sort((a, b) => a.timestamp - b.timestamp);
}
