import assert from "node:assert/strict";
import mongoose from "mongoose";
import User from "../../modules/user/user.model.js";
import BR from "../../modules/br/br.model.js";
import Admin from "../../modules/admin/admin.model.js";
import { student } from "../fixtures/library.js";
import { sessionHeaders } from "../fixtures/sessions.js";
export async function exerciseStudentAdministration(t, origin) {
    const admin = await Admin.create({
            userId: "pagination-admin",
            password: "synthetic-pagination-password",
        }),
        headers = await sessionHeaders(admin.id, "admin");
    const users = await User.insertMany(
        Array.from({ length: 5 }, (_, index) => ({
            ...student,
            _id: new mongoose.Types.ObjectId(),
            name: `Pager [literal] ${index}`,
            email: `pager-${index}@example.test`,
            rollNumber: 240180000 + index,
            isBR: index === 0,
            deviceToken: "must-not-leave-projection",
            previousCourses: [
                {
                    year: 2024,
                    semester: 1,
                    courses: [{ code: "CS101", name: "Historical course" }],
                },
            ],
        })),
    );
    const records = await BR.insertMany([
        { email: "PAGER-2@EXAMPLE.TEST" },
        { email: "pager-pending@example.test" },
    ]);
    t.after(async () => {
        await User.deleteMany({ _id: { $in: users.map((item) => item._id) } });
        await BR.deleteMany({ _id: { $in: records.map((item) => item._id) } });
        await Admin.deleteOne({ _id: admin._id });
    });
    const get = async (path) => {
        const response = await fetch(origin + path, { headers });
        const data = await response.json();
        assert.equal(response.status, 200, JSON.stringify(data));
        return data;
    };
    await t.test(
        "student pages are stable, bounded and omit full histories and private fields",
        async () => {
            const query =
                "/api/student/all?q=" + encodeURIComponent("Pager [literal]") + "&pageSize=2";
            const first = await get(query + "&page=1"),
                second = await get(query + "&page=2");
            assert.equal(first.total, 5);
            assert.equal(first.page, 1);
            assert.equal(first.pageSize, 2);
            assert.equal(first.items.length, 2);
            assert.equal(second.items.length, 2);
            assert.ok(
                first.items.every((item) => !second.items.some((other) => other._id === item._id)),
            );
            assert.ok(first.items[0].rollNumber > first.items[1].rollNumber);
            for (const item of [...first.items, ...second.items])
                for (const field of [
                    "courses",
                    "previousCourses",
                    "readOnly",
                    "favourites",
                    "deviceToken",
                ])
                    assert.equal(field in item, false, field);
            const empty = await get(query + "&page=50");
            assert.deepEqual(empty.items, []);
            assert.equal(empty.total, 5);
            assert.equal(empty.page, 50);
        },
    );
    await t.test(
        "search treats regex metacharacters literally and matches roll numbers and email",
        async () => {
            for (const q of [".*", "(unclosed"]) {
                const data = await get("/api/student/search?q=" + encodeURIComponent(q));
                assert.deepEqual(data.items, []);
            }
            assert.equal(
                (await get("/api/student/search?q=" + encodeURIComponent("[literal]"))).total,
                5,
            );
            assert.equal((await get("/api/student/all?q=240180004")).items[0]._id, users[4].id);
            assert.equal(
                (await get("/api/student/all?q=pager-2%40example.test")).items[0]._id,
                users[2].id,
            );
        },
    );
    await t.test(
        "BR filtering uses the registry and includes pending registration rows",
        async () => {
            const all = await get("/api/student/all?q=Pager");
            assert.equal(all.items.find((item) => item._id === users[0].id).isBR, false);
            assert.equal(all.items.find((item) => item._id === users[2].id).isBR, true);
            const data = await get("/api/student/all?isBR=true&q=pager");
            assert.equal(data.total, 2);
            assert.equal(data.items.find((item) => item._id === users[2].id).isRegistered, true);
            const pending = data.items.find((item) => item.email === "pager-pending@example.test");
            assert.equal(pending.isRegistered, false);
            assert.equal(pending.rollNumber, "PENDING");
            assert.equal((await get("/api/br/allBRs?q=pager")).total, 2);
        },
    );
    await t.test(
        "student details are separately authorized and retain academic histories",
        async () => {
            const { item } = await get("/api/student/" + users[2].id);
            assert.equal(item.isBR, true);
            assert.equal(item.previousCourses[0].year, 2024);
            assert.equal(item.courses[0].code, "CS101");
            assert.equal("deviceToken" in item, false);
            assert.equal("favourites" in item, false);
            assert.equal((await fetch(origin + "/api/student/" + users[2].id)).status, 401);
        },
    );
    await t.test("invalid list queries and resource IDs return safe client errors", async () => {
        for (const suffix of ["?page=0", "?pageSize=101", "?q=a&q=b", "?isBR=maybe"]) {
            const response = await fetch(origin + "/api/student/all" + suffix, { headers });
            assert.equal(response.status, 400);
            assert.ok((await response.json()).message);
        }
        assert.equal((await fetch(origin + "/api/student/not-an-id", { headers })).status, 404);
    });
}
