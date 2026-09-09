import { test } from "node:test";
import assert from "node:assert/strict";
import { withRevision } from "../utils/resourceRevision.js";

test("resource revisions cover nested file changes, empty trees, shared membership and capabilities", () => {
    const before = {
        code: "CS101",
        children: [
            {
                _id: "year",
                children: [{ _id: "folder", children: [{ _id: "file", name: "Notes.pdf" }] }],
            },
        ],
        capabilities: { canManage: true },
    };
    const revision = withRevision(before).revision;
    assert.equal(withRevision(structuredClone(before)).revision, revision);
    assert.equal(withRevision(withRevision(before)).revision, revision);
    for (const change of [
        (value) => {
            value.children = [];
        },
        (value) => {
            value.children[0].children[0].children[0].name = "Renamed.pdf";
        },
        (value) => {
            value.children[0].affectedCourses = ["CS101", "MA101"];
        },
        (value) => {
            value.capabilities.canManage = false;
        },
    ]) {
        const next = structuredClone(before);
        change(next);
        assert.notEqual(withRevision(next).revision, revision);
    }
    assert.equal(before.revision, undefined);
});
