import assert from "node:assert/strict";
import mongoose from "mongoose";
import User from "../../modules/user/user.model.js";
import CourseAllotment from "../../modules/course/courseAllotment.model.js";
import Course from "../../modules/course/course.model.js";
import { getExamSchedule } from "../../services/examSchedule.js";
import { academicPeriod } from "../../services/academicPeriod.js";
import { student } from "../fixtures/library.js";
import { sessionHeaders } from "../fixtures/sessions.js";

export async function exerciseExams(t, origin) {
    const person = await User.create({
        ...student,
        _id: new mongoose.Types.ObjectId(),
        email: "exam-schedule@example.test",
        rollNumber: 240199950,
        courses: [{ code: "BM5101H", name: "Stale registered course" }],
        readOnly: [{ code: "RT5022", name: "Manually added course" }],
    });
    const current = academicPeriod();
    const allotment = await CourseAllotment.create({
        rollNumber: person.rollNumber,
        year: 2026,
        session: "July-Nov",
        courses: ["RT5022"],
    });
    const course = await Course.create({
        code: "RT5022",
        name: "Current research methods name",
        children: [],
    });
    t.after(async () => {
        await User.deleteOne({ _id: person._id });
        await CourseAllotment.deleteMany({ rollNumber: person.rollNumber });
        await Course.deleteOne({ _id: course._id });
    });
    await t.test(
        "exam service uses period allotments and current course names, ignoring saved course arrays",
        async () => {
            const data = await getExamSchedule(person, new Date("2026-09-09T06:30:00Z"));
            assert.deepEqual(
                data.exams.midSem.items.map(({ code, name }) => [code, name]),
                [["RT5022", "Current research methods name"]],
            );
            assert.equal(data.exams.midSem.nextExam.daysUntil, 4);
            await Course.findByIdAndUpdate(course._id, {
                $set: { name: "Renamed research methods" },
            });
            assert.equal(
                (await getExamSchedule(person, new Date("2026-09-09T06:30:00Z"))).exams.midSem
                    .items[0].name,
                "Renamed research methods",
            );
            assert.equal(
                (await getExamSchedule(person, new Date("2027-01-01T00:00:00Z"))).reason,
                "REGISTRATION_UNAVAILABLE",
            );
        },
    );
    await t.test(
        "exam endpoint requires a session and ignores attempts to select another student's registrations",
        async () => {
            const anonymous = await fetch(origin + "/api/event/examdates");
            assert.equal(anonymous.status, 401);
            const headers = await sessionHeaders(person.id, "student");
            const expected = await getExamSchedule(person);
            const response = await fetch(
                origin + "/api/event/examdates?rollNumber=240101001&course=BM5101H&year=2025",
                { headers },
            );
            assert.equal(response.status, 200);
            assert.equal(response.headers.get("cache-control"), "private, no-store");
            const actual = await response.json();
            assert.deepEqual(actual.period, current);
            assert.equal(actual.status, expected.status);
            assert.deepEqual(actual.exams, expected.exams);
            assert.equal(JSON.stringify(actual).includes("Stale registered course"), false);
        },
    );
    await t.test(
        "a persisted empty allotment is no-exam; a missing one is unavailable",
        async () => {
            await CourseAllotment.findByIdAndUpdate(allotment._id, { $set: { courses: [] } });
            const empty = await getExamSchedule(person, new Date("2026-09-09T06:30:00Z"));
            assert.equal(empty.exams.midSem.status, "none");
            await CourseAllotment.deleteOne({ _id: allotment._id });
            assert.equal(
                (await getExamSchedule(person, new Date("2026-09-09T06:30:00Z"))).reason,
                "REGISTRATION_UNAVAILABLE",
            );
        },
    );
    await t.test(
        "database failures reach the safe error response and the next request recovers",
        async (sub) => {
            const headers = await sessionHeaders(person.id, "student");
            const mock = sub.mock.method(CourseAllotment, "findOne", () => ({
                lean: async () => {
                    throw new Error("private database failure details");
                },
            }));
            const response = await fetch(origin + "/api/event/examdates", { headers });
            assert.equal(response.status, 500);
            const error = await response.json();
            assert.equal(JSON.stringify(error).includes("private database"), false);
            assert.ok(error.requestId);
            mock.mock.restore();
            assert.equal((await fetch(origin + "/api/event/examdates", { headers })).status, 200);
        },
    );
}
