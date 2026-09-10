import "./support/environment.js";
import assert from "node:assert/strict";
import { test } from "node:test";
import { calculateExamSchedule, parseExamWindow } from "../services/examSchedule.js";
import timetable from "../data/examSchedules/july-nov-2026.js";

const user = { rollNumber: 240101001, degree: "B.Tech", semester: 5 };
const period = { year: 2026, session: "July-Nov" };
const input = (changes = {}) => ({
    user,
    now: new Date("2026-09-09T06:30:00Z"),
    allotment: { ...period, courses: ["RT5022", "BM5101H"] },
    schedule: timetable,
    ...changes,
});

test("the next exam and calendar-day countdown come from the same sorted course schedule", () => {
    const result = calculateExamSchedule(
        input({ names: new Map([["RT5022", "Research methods"]]) }),
    );
    assert.equal(result.status, "ready");
    assert.equal(result.timeZone, "Asia/Kolkata");
    assert.deepEqual(
        result.exams.midSem.items.map((item) => item.code),
        ["RT5022", "BM5101H"],
    );
    assert.equal(result.exams.midSem.nextExam.startsAt, result.exams.midSem.items[0].startsAt);
    assert.equal(result.exams.midSem.nextExam.name, "Research methods");
    assert.equal(result.exams.midSem.nextExam.daysUntil, 4);
    assert.equal(result.exams.endSem.nextExam.daysUntil, 66);
});
test("normalization and duplicate registrations preserve each course's exact slot", () => {
    const result = calculateExamSchedule(
        input({ allotment: { ...period, courses: [" bm 5101h ", "BM5101H", "BM5181H"] } }),
    );
    assert.deepEqual(
        result.exams.midSem.items.map(({ code, slot, startsAt }) => [code, slot, startsAt]),
        [
            ["BM5101H", "A", "2026-09-14T03:30:00.000Z"],
            ["BM5181H", "A1", "2026-09-14T08:30:00.000Z"],
        ],
    );
});
test("unmapped courses retain their status without suppressing the next listed exam", () => {
    const allMissing = calculateExamSchedule(
        input({ allotment: { ...period, courses: ["QA999"] } }),
    );
    assert.equal(allMissing.exams.midSem.status, "unavailable");
    assert.equal(allMissing.exams.midSem.nextExam, null);
    const partial = calculateExamSchedule(
        input({ allotment: { ...period, courses: ["RT5022", "QA999"] } }),
    );
    assert.equal(partial.exams.midSem.status, "partial");
    assert.equal(partial.exams.midSem.items.length, 1);
    assert.deepEqual(partial.exams.midSem.missingCourses, [{ code: "QA999", name: "QA999" }]);
    assert.equal(partial.exams.midSem.nextExam.code, "RT5022");
    assert.equal(partial.exams.midSem.nextExam.daysUntil, 4);
    assert.equal(partial.exams.endSem.nextExam.daysUntil, 66);
});
test("a partial schedule advances through listed exams and clears each completed countdown independently", () => {
    const allotment = { ...period, courses: ["RT5022", "BM5101H", "QA999"] };
    for (const [instant, code, state, days] of [
        ["2026-09-12T18:29:59Z", "RT5022", "upcoming", 1],
        ["2026-09-12T18:30:00Z", "RT5022", "upcoming", 0],
        ["2026-09-13T03:30:00Z", "RT5022", "ongoing", 0],
        ["2026-09-13T05:30:00Z", "BM5101H", "upcoming", 1],
    ]) {
        const { nextExam } = calculateExamSchedule(input({ allotment, now: new Date(instant) }))
            .exams.midSem;
        assert.equal(nextExam.code, code);
        assert.equal(nextExam.state, state);
        assert.equal(nextExam.daysUntil, days);
    }
    const afterMid = calculateExamSchedule(
        input({ allotment, now: new Date("2026-09-14T05:30:00Z") }),
    );
    assert.equal(afterMid.exams.midSem.status, "partial");
    assert.equal(afterMid.exams.midSem.nextExam, null);
    assert.ok(afterMid.exams.midSem.items.every(({ state }) => state === "finished"));
    assert.equal(afterMid.exams.endSem.nextExam.code, "RT5022");
    const afterEnd = calculateExamSchedule(
        input({ allotment, now: new Date("2026-11-15T06:30:00Z") }),
    );
    assert.equal(afterEnd.exams.endSem.nextExam, null);
    assert.deepEqual(afterEnd.exams.endSem.missingCourses, [{ code: "QA999", name: "QA999" }]);
});
test("empty registrations and explicit no-exam mappings differ from missing registrations", () => {
    for (const courses of [[], ["LAB001"], ["RT5022"]]) {
        const schedule = {
            period,
            courseSlotMap: { LAB001: null, RT5022: "G" },
            slotSchedule: { G: { midSem: null, endSem: null } },
        };
        const result = calculateExamSchedule(
            input({ allotment: { ...period, courses }, schedule }),
        );
        assert.equal(result.exams.midSem.status, "none");
        assert.deepEqual(result.exams.midSem.items, []);
    }
    assert.equal(
        calculateExamSchedule(input({ allotment: null })).reason,
        "REGISTRATION_UNAVAILABLE",
    );
    assert.equal(
        calculateExamSchedule(
            input({ allotment: { year: 2025, session: "July-Nov", courses: [] } }),
        ).reason,
        "REGISTRATION_UNAVAILABLE",
    );
});
test("missing timetable data cannot become no-exam, even for a mapped registered course", () => {
    assert.equal(calculateExamSchedule(input({ schedule: null })).reason, "SCHEDULE_UNAVAILABLE");
    const result = calculateExamSchedule(
        input({ schedule: { period, courseSlotMap: { RT5022: "G" }, slotSchedule: {} } }),
    );
    assert.equal(result.exams.midSem.status, "unavailable");
});
test("first-year B.Tech exclusions follow the current academic semester, not a stale profile edit", () => {
    const person = { rollNumber: 260101001, degree: "B. Tech", semester: 5 };
    for (const now of [new Date("2026-09-09T00:00Z"), new Date("2027-02-01T00:00Z")])
        assert.equal(calculateExamSchedule(input({ user: person, now })).status, "excluded");
    assert.notEqual(
        calculateExamSchedule(input({ user: { ...person, degree: "B.Des" } })).status,
        "excluded",
    );
    assert.notEqual(
        calculateExamSchedule(input({ user: { ...user, semester: 1 } })).status,
        "excluded",
    );
    assert.notEqual(
        calculateExamSchedule(input({ user: person, now: new Date("2027-07-24T00:00Z") })).status,
        "excluded",
    );
});
test("countdowns switch at Kolkata midnight, independently of the host timezone", (t) => {
    const previous = process.env.TZ;
    t.after(() => {
        if (previous === undefined) delete process.env.TZ;
        else process.env.TZ = previous;
    });
    for (const zone of ["UTC", "America/Los_Angeles", "Asia/Tokyo"]) {
        process.env.TZ = zone;
        const before = calculateExamSchedule(input({ now: new Date("2026-09-12T18:29:59Z") }));
        const after = calculateExamSchedule(input({ now: new Date("2026-09-12T18:30:00Z") }));
        assert.equal(before.exams.midSem.nextExam.daysUntil, 1);
        assert.equal(before.refreshAfterMs, 1000);
        assert.equal(after.exams.midSem.nextExam.daysUntil, 0);
    }
});
test("today, ongoing, the next exam, and completed schedules have distinct states", () => {
    const beforeStart = calculateExamSchedule(input({ now: new Date("2026-09-13T03:29:59Z") }));
    assert.equal(beforeStart.exams.midSem.nextExam.state, "upcoming");
    assert.equal(beforeStart.refreshAfterMs, 1000);
    const ongoing = calculateExamSchedule(input({ now: new Date("2026-09-13T03:30:00Z") }));
    assert.equal(ongoing.exams.midSem.nextExam.state, "ongoing");
    const next = calculateExamSchedule(input({ now: new Date("2026-09-13T05:30:00Z") }));
    assert.equal(next.exams.midSem.nextExam.code, "BM5101H");
    assert.equal(next.exams.midSem.items[0].state, "finished");
    const complete = calculateExamSchedule(input({ now: new Date("2026-12-01T00:00:00Z") }));
    assert.equal(complete.exams.midSem.status, "complete");
    assert.equal(complete.exams.midSem.nextExam, null);
    assert.equal(complete.exams.midSem.items.length, 2);
});
test("semester rollover never reuses a different period's timetable or registered courses", () => {
    const now = new Date("2026-12-31T18:30:00Z"),
        next = { year: 2027, session: "Jan-May" };
    assert.equal(calculateExamSchedule(input({ now })).reason, "REGISTRATION_UNAVAILABLE");
    const result = calculateExamSchedule(
        input({ now, allotment: { ...next, courses: ["RT5022"] } }),
    );
    assert.deepEqual(result.period, next);
    assert.equal(result.reason, "SCHEDULE_UNAVAILABLE");
    assert.deepEqual(result.exams, {});
});
test("invalid dates, time windows and out-of-period slot dates are unavailable rather than normalized", () => {
    for (const info of [
        { date: "31-09-2026", time: "9:00-11:00" },
        { date: "14-09-2026", time: "25:00-26:00" },
        { date: "14-09-2026", time: "9:60-11:00" },
        { date: "14-09-2026", time: "11:00-9:00" },
        { date: "14-09-2026", time: "9:00-9:00" },
        { date: "14-09-2025", time: "9:00-11:00" },
        { date: "14-02-2026", time: "9:00-11:00" },
        {},
    ])
        assert.equal(parseExamWindow(info, period), null);
    const schedule = {
        period,
        courseSlotMap: { RT5022: "G" },
        slotSchedule: { G: { midSem: { date: "31-09-2026", time: "9:00-11:00" } } },
    };
    assert.equal(calculateExamSchedule(input({ schedule })).exams.midSem.status, "unavailable");
});
test("every stored slot in the preserved timetable is a valid Kolkata exam window for its period", () => {
    for (const slot of Object.values(timetable.courseSlotMap))
        assert.ok(timetable.slotSchedule[slot]);
    for (const [slot, types] of Object.entries(timetable.slotSchedule))
        for (const [type, info] of Object.entries(types))
            assert.ok(parseExamWindow(info, timetable.period), `${slot} ${type}`);
});
