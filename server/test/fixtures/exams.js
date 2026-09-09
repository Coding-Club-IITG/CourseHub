export const examCourses = [
    { code: "RT5022", name: "Research methods and technical communication" },
    { code: "BM5101H", name: "Biomedical systems and quantitative methods" },
];
export const examResponse = {
    status: "ready",
    period: { year: 2026, session: "July-Nov" },
    timeZone: "Asia/Kolkata",
    generatedAt: "2026-09-09T06:30:00.000Z",
    refreshAfterMs: 60_000,
    exams: Object.fromEntries(
        ["midSem", "endSem"].map((type) => {
            const items = examCourses.map((course, index) => {
                const date = type === "midSem" ? `2026-09-${13 + index}` : `2026-11-${14 + index}`;
                return {
                    ...course,
                    slot: index ? "A" : "G",
                    date,
                    time: type === "midSem" ? "09:00–11:00" : "09:00–12:00",
                    startsAt: `${date}T03:30:00.000Z`,
                    endsAt: `${date}T${type === "midSem" ? "05" : "06"}:30:00.000Z`,
                    state: "upcoming",
                };
            });
            return [
                type,
                {
                    status: "scheduled",
                    items,
                    missingCourses: [],
                    nextExam: {
                        ...items[0],
                        courseCodes: [items[0].code],
                        daysUntil: type === "midSem" ? 4 : 66,
                    },
                },
            ];
        }),
    ),
};
export const unavailableExamResponse = {
    ...examResponse,
    status: "unavailable",
    reason: "SCHEDULE_UNAVAILABLE",
    exams: {},
};
