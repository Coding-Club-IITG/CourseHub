import assert from "node:assert/strict";
import Course from "../../modules/course/course.model.js";
import Admin from "../../modules/admin/admin.model.js";
import { sessionHeaders } from "../fixtures/sessions.js";
export async function exerciseCourseAdministration(t, origin) {
    const admin = await Admin.create({
            userId: "course-pagination-admin",
            password: "synthetic-pagination-password",
        }),
        headers = {
            ...(await sessionHeaders(admin.id, "admin")),
            "content-type": "application/json",
        };
    const items = await Course.insertMany(
        Array.from({ length: 5 }, (_, i) => ({
            code: `QA.PAGE${i}`,
            name: `Pagination [course] ${i}`,
            books: ["private-library-detail"],
        })),
    );
    const duplicate = await Course.collection.insertOne({
        code: "qa.\u2003page1",
        name: "Pagination [course] duplicate",
        children: [],
    });
    const unnamed = await Course.create({ code: "QA.UNNAMED", name: "Name Unavailable" });
    t.after(async () => {
        await Course.deleteMany({
            _id: { $in: [...items.map((i) => i._id), duplicate.insertedId, unnamed._id] },
        });
        await Admin.deleteOne({ _id: admin._id });
    });
    const get = async (query) => {
        const response = await fetch(origin + "/api/admin/dbcourses" + query, { headers });
        assert.equal(response.status, 200);
        return response.json();
    };
    await t.test("course pages contain bounded summaries and stable code order", async () => {
        const first = await get("?q=Pagination&pageSize=2"),
            second = await get("?q=Pagination&pageSize=2&page=2");
        assert.equal(first.total, 6);
        assert.equal(first.pageSize, 2);
        assert.equal(second.page, 2);
        assert.equal(first.items.length, 2);
        assert.equal(new Set([...first.items, ...second.items].map((i) => i._id)).size, 4);
        assert.ok(first.items.every((i) => !("children" in i) && !("books" in i)));
        const empty = await get("?q=Pagination&page=99");
        assert.equal(empty.items.length, 0);
        assert.equal(empty.total, 6);
    });
    await t.test(
        "literal course search and nameless/duplicate filters include legacy identities",
        async () => {
            assert.equal((await get("?q=" + encodeURIComponent("[course]"))).total, 6);
            assert.equal((await get("?q=" + encodeURIComponent(".*"))).total, 0);
            assert.equal((await get("?q=QA.PAGE3")).total, 1);
            assert.equal((await get("?q=Pagination&duplicates=true")).total, 2);
            assert.ok(
                (await get("?nameless=true&q=QA.UNNAMED")).items.some((i) => i._id === unnamed.id),
            );
        },
    );
    await t.test(
        "comparison is independent of list pagination and list/compare access is protected",
        async () => {
            const response = await fetch(origin + "/api/admin/imports/preview", {
                method: "POST",
                headers,
                body: JSON.stringify({
                    type: "courses",
                    rows: [{ code: "QA.PAGE4", name: "New title" }],
                }),
            });
            assert.equal(response.status, 200);
            assert.equal((await response.json()).rows[0].code, "QA.PAGE4");
            assert.equal((await fetch(origin + "/api/admin/dbcourses")).status, 401);
            assert.equal(
                (await fetch(origin + "/api/admin/dbcourses?pageSize=101", { headers })).status,
                400,
            );
            assert.equal(
                (
                    await fetch(origin + "/api/admin/imports/preview", {
                        method: "POST",
                        headers,
                        body: JSON.stringify({
                            type: "courses",
                            rows: [{ code: "../bad", name: "Name" }],
                        }),
                    })
                ).status,
                400,
            );
        },
    );
}
