import "./support/environment.js";
import assert from "node:assert/strict";
import { test } from "node:test";
import User from "../modules/user/user.model.js";
import { FileModel } from "../modules/course/course.model.js";
import { student, libraryFile } from "./fixtures/library.js";

test("course references validate new writes without creating embedded identities", async () => {
    const history = [{ semester: 1, year: 2024, courses: [{ code: "CS101", color: "#ffee00" }] }];
    const user = new User({ ...student, previousCourses: history });
    await user.validate();
    assert.deepEqual(user.toObject().previousCourses, history);
    assert.equal(user.toObject().courses[0]._id, undefined);
    for (const fields of [
        { courses: ["CS101"] },
        { courses: [{ name: "Missing identity" }] },
        { courses: [{ code: "CS101", canManage: true }] },
        { previousCourses: [{ code: "CS101" }] },
        { previousCourses: [{ semester: 1.5, courses: [] }] },
        { readOnly: [{ arbitrary: "shape" }] },
        { semester: undefined },
        { semester: 0 },
    ])
        await assert.rejects(new User({ ...student, ...fields }).validate(), {
            name: "ValidationError",
        });
});

test("byte counts are exact optional integers; legacy reads never guess units", async () => {
    for (const sizeBytes of [-1, 0.5, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
        await assert.rejects(new FileModel({ ...libraryFile, sizeBytes }).validate(), {
            name: "ValidationError",
        });
    }
    const legacy = FileModel.hydrate({ ...libraryFile, size: "1.2 MB", course: "CS101" });
    assert.equal(legacy.sizeBytes, undefined);
    assert.equal(legacy.toObject().course, "CS101");
    assert.equal(legacy.size, "1.2 MB");
    const exact = new FileModel({ ...libraryFile, size: undefined, sizeBytes: 0 });
    await exact.validate();
    assert.equal(exact.sizeBytes, 0);
});

test("unconverted historical records remain readable without silently restructuring them", () => {
    const previousCourses = [{ code: "CS101", name: "Flat historical record" }];
    const user = User.hydrate({ ...student, previousCourses });
    assert.deepEqual(user.toObject().previousCourses, previousCourses);
});
