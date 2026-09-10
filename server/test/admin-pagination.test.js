import assert from "node:assert/strict";
import { test } from "node:test";
import { escapeSearch, listParameters } from "../utils/pagination.js";
test("admin list parameters reject invalid bounds and preserve literal search characters", () => {
    assert.deepEqual(listParameters({}), { page: 1, pageSize: 20, q: "" });
    assert.deepEqual(listParameters({ page: "2", pageSize: "100", q: "  [a].*  " }), {
        page: 2,
        pageSize: 100,
        q: "[a].*",
    });
    for (const query of [
        { page: "0" },
        { page: "-1" },
        { page: "1.5" },
        { pageSize: "101" },
        { pageSize: ["20"] },
        { q: ["a", "b"] },
        { q: "a".repeat(121) },
    ])
        assert.throws(() => listParameters(query), { status: 400 });
    const literal = "[a].*+$^(test)\\?";
    const regex = new RegExp(escapeSearch(literal), "i");
    assert.ok(regex.test(literal));
    assert.equal(regex.test("anything"), false);
});
