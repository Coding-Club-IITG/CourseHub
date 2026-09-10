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
    const response = await fetch(origin + "/api/br/coursesWithoutBR", {
        headers: await sessionHeaders(admin.id, "admin"),
    });
    assert.equal(response.status, 200);
    const data = await response.json(),
        uncovered = data.coursesWithoutBR
            .filter((course) => codes.includes(course.code))
            .map((course) => course.code)
            .sort();
    assert.deepEqual(uncovered, [codes[2], codes[3], codes[4]].sort());
    const actor = await actorFor({ user });
    assert.deepEqual(actor.managed.sort(), [codes[0], codes[1]].sort());
    assert.ok(data.coursesWithoutBR.every((item) => !("children" in item)));
    assert.equal((await fetch(origin + "/api/br/coursesWithoutBR")).status, 401);
}
