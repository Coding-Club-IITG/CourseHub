import assert from "node:assert/strict";
import BR from "../../modules/br/br.model.js";
import User from "../../modules/user/user.model.js";
import Admin from "../../modules/admin/admin.model.js";
import Course from "../../modules/course/course.model.js";
import Allotment from "../../modules/course/courseAllotment.model.js";
import { academicPeriod, actorFor } from "../../services/authorization.js";
import { sessionHeaders } from "../fixtures/sessions.js";
export async function exerciseBRCoverage(t, origin) {
    const period = academicPeriod(),
        codes = [
            "QA.COVERHIST",
            "QA.COVERNOW",
            "QA.COVERPROFILE",
            "QA.COVERFUTURE",
            "QA.COVEROTHER",
        ];
    const admin = await Admin.create({ userId: "coverage-admin", password: "synthetic-password" }),
        user = await User.create({
            rollNumber: 240909091,
            email: "coverage@example.test",
            name: "Coverage tester",
            degree: "BTech",
            department: "CSE",
            courses: [{ code: codes[2], name: codes[2] }],
            readOnly: [{ code: codes[4], name: codes[4] }],
            semester: 99,
            isBR: false,
        }),
        br = await BR.create({ email: "COVERAGE@EXAMPLE.TEST" });
    const courses = await Course.insertMany(codes.map((code) => ({ code, name: code }))),
        allotments = await Allotment.insertMany([
            {
                rollNumber: user.rollNumber,
                year: period.year - 1,
                session: "July-Nov",
                courses: [codes[0]],
            },
            { rollNumber: user.rollNumber, ...period, courses: [codes[1]] },
            {
                rollNumber: user.rollNumber,
                year: period.year + 1,
                session: "Jan-May",
                courses: [codes[3]],
            },
        ]);
    t.after(async () => {
        await Promise.all([
            Admin.deleteOne({ _id: admin._id }),
            User.deleteOne({ _id: user._id }),
            BR.deleteOne({ _id: br._id }),
            Course.deleteMany({ _id: { $in: courses.map((item) => item._id) } }),
            Allotment.deleteMany({ _id: { $in: allotments.map((item) => item._id) } }),
        ]);
    });
    const uncovered = [codes[2], codes[3], codes[4]].sort();
    const actor = await actorFor({ user });
    assert.deepEqual(actor.managed.sort(), [codes[0], codes[1]].sort());
    const headers = await sessionHeaders(admin.id, "admin");
    const list = async (query) => {
        const result = await fetch(origin + "/api/admin/dbcourses?q=QA.COVER&" + query, {
            headers,
        });
        assert.equal(result.status, 200);
        return result.json();
    };
    await t.test("the course filter uses the same BR coverage before pagination", async () => {
        const first = await list("withoutBR=true&pageSize=2"),
            second = await list("withoutBR=true&pageSize=2&page=2");
        assert.equal(first.total, 3);
        assert.equal(second.total, 3);
        assert.equal(first.items.length, 2);
        assert.equal(second.items.length, 1);
        assert.deepEqual(
            [...first.items, ...second.items].map((item) => item.code).sort(),
            uncovered,
        );
        assert.ok(first.items.every((item) => !("children" in item) && !("books" in item)));
        assert.equal((await list("withoutBR=false")).total, 5);
        for (const value of ["yes", "1", ""]) {
            assert.equal(
                (await fetch(origin + "/api/admin/dbcourses?withoutBR=" + value, { headers }))
                    .status,
                400,
            );
        }
        assert.equal((await fetch(origin + "/api/admin/dbcourses?withoutBR=true")).status, 401);
        assert.equal(
            (
                await fetch(origin + "/api/admin/dbcourses?withoutBR=true", {
                    headers: await sessionHeaders(user.id, "student"),
                })
            ).status,
            403,
        );
    });
    await t.test(
        "coverage follows registry changes without trusting editable profile roles",
        async () => {
            await BR.deleteOne({ _id: br._id });
            assert.equal((await list("withoutBR=true")).total, 5);
            await BR.create({ _id: br._id, email: br.email });
            assert.equal((await list("withoutBR=true")).total, 3);
        },
    );
}
