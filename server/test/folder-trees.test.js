import assert from "node:assert/strict";
import { test } from "node:test";
import {
    buildLibraryGraph,
    walkFolderTree,
    assertValidCourseTree,
    treeLimits,
} from "../services/folderTrees.js";
import { planCourseLink } from "../services/courseLinking.js";

const folder = (
    _id,
    children = [],
    childType = "Folder",
    courses = ["AA101", "BB101"],
    name = "2026",
) => ({ _id, name, children, childType, courses });
const courses = (a, b = []) => [
    { _id: "a", code: "AA101", children: a },
    { _id: "b", code: "BB101", children: b },
];

test("membership filters unlinked root years and leaves at every level", () => {
    const graph = buildLibraryGraph(
        courses(["year", "hidden"], ["year", "hidden"]),
        [
            folder("year", ["shared", "only-a"]),
            folder("shared", ["file"], "File"),
            folder("only-a", [], "File", ["AA101"]),
            folder("hidden", [], "File", ["BB101"]),
        ],
        ["file"],
    );
    assert.deepEqual(
        [...walkFolderTree(graph, ["year", "hidden"], "AA101").folders],
        ["year", "shared", "only-a"],
    );
    assert.deepEqual([...graph.folderCourses.get("hidden")], ["BB101"]);
    assert.deepEqual([...graph.fileCourses.get("file")], ["AA101", "BB101"]);
});

test("cycles, dangling folder/file references and excessive depth are explicit and isolated to their course", () => {
    const cases = [
        [[folder("root", ["root"], "Folder", ["AA101"])], "TREE_CYCLE"],
        [[folder("root", ["missing"], "Folder", ["AA101"])], "TREE_DANGLING_REFERENCE"],
        [[folder("root", ["missing"], "File", ["AA101"])], "TREE_DANGLING_REFERENCE"],
        [
            Array.from({ length: treeLimits.depth + 1 }, (_, i) =>
                folder(i ? `n${i}` : "root", i < treeLimits.depth ? [`n${i + 1}`] : [], "Folder", [
                    "AA101",
                ]),
            ),
            "TREE_DEPTH_EXCEEDED",
        ],
    ];
    for (const [broken, code] of cases) {
        const graph = buildLibraryGraph(
            courses(["root"], ["good"]),
            [...broken, folder("good", [], "File", ["BB101"])],
            [],
        );
        assert.throws(() => assertValidCourseTree(graph, "AA101"), { code });
        assert.doesNotThrow(() => assertValidCourseTree(graph, "BB101"));
        assert.equal(graph.folderCourses.has("root"), false);
        assert.deepEqual([...graph.folderCourses.get("good")], ["BB101"]);
    }
});

test("shared paths cannot bypass the depth limit after a node was first visited through a short path", () => {
    const chain = Array.from({ length: 64 }, (_, i) =>
        folder(`n${i}`, i < 63 ? [`n${i + 1}`] : []),
    );
    const graph = buildLibraryGraph(
        courses(["n1", "extra"]),
        [...chain, folder("extra", ["n0"])],
        [],
    );
    assert.throws(() => assertValidCourseTree(graph, "AA101"), { code: "TREE_DEPTH_EXCEEDED" });
});

test("linking preserves every populated duplicate target year and reports a conflict", () => {
    const folders = [
        folder("source", ["s"], "File", ["AA101"]),
        folder("first", ["f1"], "File", ["BB101"]),
        folder("second", ["f2"], "File", ["BB101"]),
        folder("empty", [], "File", ["BB101"]),
    ];
    const graph = buildLibraryGraph(courses(["source"], ["empty", "first", "second"]), folders, [
        "s",
        "f1",
        "f2",
    ]);
    const plan = planCourseLink(graph, "AA101", "BB101");
    assert.deepEqual(plan.roots, ["empty", "first", "second"]);
    assert.deepEqual(plan.addMembership, []);
    assert.deepEqual(plan.removeMembership, []);
    assert.equal(plan.result.conflicts.length, 1);
    assert.deepEqual(plan.result.conflicts[0].targetIds, ["empty", "first", "second"]);
});

test("linking replaces only empty structures and inherits source-visible descendants", () => {
    const graph = buildLibraryGraph(
        courses(["source"], ["empty1", "empty2"]),
        [
            folder("source", ["shared", "hidden"], "Folder", ["AA101"]),
            folder("shared", ["file"], "File", ["AA101"]),
            folder("hidden", ["other-file"], "File", ["OTHER"]),
            folder("empty1", ["empty-leaf"], "Folder", ["BB101"]),
            folder("empty-leaf", [], "File", ["BB101"]),
            folder("empty2", [], "File", ["BB101"]),
        ],
        ["file", "other-file"],
    );
    const plan = planCourseLink(graph, "AA101", "BB101");
    assert.deepEqual(plan.roots, ["source"]);
    assert.deepEqual(plan.addMembership, ["source", "shared"]);
    assert.deepEqual(plan.removeMembership, ["empty1", "empty-leaf", "empty2"]);
    assert.equal(plan.result.replaced.length, 2);
});

test("repeated linking preserves intentionally unlinked descendants and ambiguous source years", () => {
    const graph = buildLibraryGraph(
        courses(["same", "one", "two"], ["same"]),
        [
            folder("same", ["unlinked"], "Folder", ["AA101", "BB101"], "2025"),
            folder("unlinked", [], "File", ["AA101"]),
            folder("one", [], "File", ["AA101"]),
            folder("two", [], "File", ["AA101"]),
        ],
        [],
    );
    const plan = planCourseLink(graph, "AA101", "BB101");
    assert.deepEqual(plan.roots, ["same"]);
    assert.deepEqual(plan.addMembership, []);
    assert.equal(plan.result.alreadyLinked.length, 1);
    assert.equal(plan.result.conflicts.length, 1);
});

test("combining individually valid courses cannot publish an oversized target tree", () => {
    const a = Array.from({ length: 6000 }, (_, i) => `a${i}`),
        b = Array.from({ length: 6000 }, (_, i) => `b${i}`);
    const graph = buildLibraryGraph(
        courses(["source"], ["target"]),
        [
            folder("source", a, "File", ["AA101"], "2025"),
            folder("target", b, "File", ["BB101"], "2026"),
        ],
        [...a, ...b],
    );
    assert.doesNotThrow(() => assertValidCourseTree(graph, "AA101"));
    assert.doesNotThrow(() => assertValidCourseTree(graph, "BB101"));
    assert.throws(() => planCourseLink(graph, "AA101", "BB101"), { code: "TREE_TOO_LARGE" });
    assert.deepEqual(graph.courses.get("BB101").children, ["target"]);
});

test("duplicate normalized identities and invalid child types are explicit repair errors", () => {
    const graph = buildLibraryGraph(
        [
            { code: " aa101 ", children: [] },
            { code: "AA101", children: [] },
        ],
        [],
        [],
    );
    assert.throws(() => assertValidCourseTree(graph, "AA101"), { code: "TREE_DUPLICATE_COURSE" });
    const invalid = buildLibraryGraph(courses(["root"]), [folder("root", [], "Unknown")], []);
    assert.throws(() => assertValidCourseTree(invalid, "AA101"), {
        code: "TREE_INVALID_STRUCTURE",
    });
});
