import { academicPeriod, courseSemester } from "./academicPeriod.js";
import { normalizeCourseCode } from "@coursehub/domain";
import CourseAllotment from "../modules/course/courseAllotment.model.js";
import Course from "../modules/course/course.model.js";
import julyNovember2026 from "../data/examSchedules/july-nov-2026.js";

const schedules = [julyNovember2026];
const dayMs = 86_400_000;
const offsetMs = 330 * 60_000;
export const examTypes = ["midSem", "endSem"];
const localDate = (instant) => new Date(Number(instant) + offsetMs).toISOString().slice(0, 10);
const samePeriod = (a, b) => a?.year === b.year && a.session === b.session;

export function parseExamWindow(info, period) {
    const date = /^(\d{2})-(\d{2})-(\d{4})$/.exec(info?.date || "");
    const time = /^(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})$/.exec(info?.time || "");
    if (!date || !time) return null;
    const dateText = `${date[3]}-${date[2]}-${date[1]}`;
    const [, startHour, startMinute, endHour, endMinute] = time.map(Number);
    if (startHour > 23 || endHour > 23 || startMinute > 59 || endMinute > 59) return null;
    const clock = (hour, minute) =>
        `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
    const startTime = clock(startHour, startMinute),
        endTime = clock(endHour, endMinute);
    const startsAt = new Date(`${dateText}T${startTime}:00+05:30`);
    const endsAt = new Date(`${dateText}T${endTime}:00+05:30`);
    if (
        !Number.isFinite(+startsAt) ||
        !Number.isFinite(+endsAt) ||
        endsAt <= startsAt ||
        localDate(startsAt) !== dateText ||
        !samePeriod(academicPeriod(startsAt), period)
    )
        return null;
    return {
        date: dateText,
        time: `${startTime}–${endTime}`,
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
    };
}

export function isExcludedFromExams(user, period) {
    const degree = String(user.degree || "")
        .toLowerCase()
        .replace(/[\s.-]/g, "");
    return degree === "btech" && courseSemester(user.rollNumber, period) <= 2;
}

export function calculateExamSchedule({
    user,
    allotment,
    schedule,
    names = new Map(),
    now = new Date(),
}) {
    const period = academicPeriod(now);
    const midnight = (Math.floor((+now + offsetMs) / dayMs) + 1) * dayMs - offsetMs;
    const response = {
        status: "ready",
        period,
        timeZone: "Asia/Kolkata",
        generatedAt: now.toISOString(),
        refreshAfterMs: Math.min(60_000, midnight - now),
        exams: {},
    };
    if (isExcludedFromExams(user, period))
        return { ...response, status: "excluded", reason: "FIRST_YEAR_BTECH" };
    if (!allotment || !samePeriod(allotment, period) || !Array.isArray(allotment.courses))
        return { ...response, status: "unavailable", reason: "REGISTRATION_UNAVAILABLE" };
    const codes = [...new Set(allotment.courses.map(normalizeCourseCode).filter(Boolean))].sort();
    if (codes.length && !samePeriod(schedule?.period, period))
        return { ...response, status: "unavailable", reason: "SCHEDULE_UNAVAILABLE" };
    for (const type of examTypes) {
        const items = [],
            missingCourses = [];
        for (const code of codes) {
            const name = names.get(code) || code;
            const slot = schedule?.courseSlotMap?.[code];
            // A deliberate null means no exam, an absent mapping means unknown
            if (slot === null) continue;
            const info = schedule?.slotSchedule?.[slot]?.[type];
            if (slot && info === null) continue;
            const window = slot && parseExamWindow(info, period);
            if (!window) {
                missingCourses.push({ code, name });
                continue;
            }
            const state =
                +now >= Date.parse(window.endsAt)
                    ? "finished"
                    : +now >= Date.parse(window.startsAt)
                      ? "ongoing"
                      : "upcoming";
            items.push({ code, name, slot, ...window, state });
        }
        items.sort((a, b) => a.startsAt.localeCompare(b.startsAt) || a.code.localeCompare(b.code));
        const next = items.find((item) => item.state !== "finished");
        const status = missingCourses.length
            ? items.length
                ? "partial"
                : "unavailable"
            : next
              ? "scheduled"
              : items.length
                ? "complete"
                : "none";
        const nextExam =
            next && !missingCourses.length
                ? {
                      ...next,
                      courseCodes: items
                          .filter((item) => item.startsAt === next.startsAt)
                          .map((item) => item.code),
                      daysUntil: Math.round(
                          (Date.parse(next.date) - Date.parse(localDate(now))) / dayMs,
                      ),
                  }
                : null;
        response.exams[type] = { status, items, missingCourses, nextExam };
        for (const item of items)
            for (const boundary of [item.startsAt, item.endsAt]) {
                const remaining = Date.parse(boundary) - now;
                if (remaining > 0)
                    response.refreshAfterMs = Math.min(response.refreshAfterMs, remaining);
            }
    }
    response.refreshAfterMs = Math.max(1000, response.refreshAfterMs);
    return response;
}

export async function getExamSchedule(user, now = new Date()) {
    const period = academicPeriod(now);
    if (isExcludedFromExams(user, period)) return calculateExamSchedule({ user, now });
    const allotment = await CourseAllotment.findOne({
        rollNumber: user.rollNumber,
        ...period,
    }).lean();
    const codes = [...new Set((allotment?.courses || []).map(normalizeCourseCode).filter(Boolean))];
    const courses = codes.length
        ? await Course.find({ code: { $in: codes } })
              .select("code name")
              .lean()
        : [];
    return calculateExamSchedule({
        user,
        now,
        allotment,
        schedule: schedules.find((item) => samePeriod(item.period, period)),
        names: new Map(courses.map((course) => [course.code, course.name])),
    });
}
