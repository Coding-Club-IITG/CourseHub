import AppError from "../utils/appError.js";

export function academicPeriod(now = new Date()) {
    const parts = Object.fromEntries(
        new Intl.DateTimeFormat("en-US", {
            timeZone: "Asia/Kolkata",
            year: "numeric",
            month: "numeric",
            day: "numeric",
        })
            .formatToParts(now)
            .map(({ type, value }) => [type, Number(value)]),
    );
    return {
        year: parts.year,
        session: parts.month < 7 || (parts.month === 7 && parts.day <= 23) ? "Jan-May" : "July-Nov",
    };
}
export const periodKey = ({ year, session }) => `${year}:${session}`;
export function studentRoll(value) {
    const text = String(value);
    if (!/^\d{9}$/.test(text))
        throw new AppError(400, "A valid student roll number is required", "INVALID_ROLL_NUMBER");
    return Number(text);
}
export function courseSemester(roll, period) {
    const joined = 2000 + Number(String(studentRoll(roll)).slice(0, 2));
    return Math.max(1, 2 * (period.year - joined) + (period.session === "July-Nov" ? 1 : 0));
}
export function historyPeriods(roll, current = academicPeriod()) {
    const joined = 2000 + Number(String(studentRoll(roll)).slice(0, 2));
    if (joined > current.year || current.year - joined > 12)
        throw new AppError(
            409,
            "The admission year requires review before history can be synchronized",
            "ACADEMIC_HISTORY_RANGE",
        );
    const periods = [];
    for (let year = joined; year <= current.year; year++) {
        for (const session of ["Jan-May", "July-Nov"]) {
            if (year === joined && session === "Jan-May") continue;
            if (
                year === current.year &&
                (session === current.session || current.session === "Jan-May")
            )
                continue;
            periods.push({ year, session });
        }
    }
    return periods;
}
