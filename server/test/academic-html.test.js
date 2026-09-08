import "./support/environment.js";
import assert from "node:assert/strict";
import { test } from "node:test";
import { parseCourseAllotmentsFromHtml } from "../utils/course.js";

// Synthetic academic-portal table
const html = `<!doctype html><table>
    <tr><th>No.</th><th>Name</th><th>Roll</th><th>Course</th></tr>
    <tr><td>1</td><td>Student A</td><td> 260100001 </td><td><b> CS&nbsp;101 </b></td></tr>
    <tr><td>2</td><td>Student A</td><td>260100001</td><td> MA 102 </td></tr>
    <tr><td>3</td><td>Student A</td><td>260100001</td><td>SA 101</td></tr>
    <tr><td>4</td><td>Student B</td><td>260100002</td><td>PH 103</td></tr>
    <tr><td>5</td><td>Student B</td><td>260100002</td><td> PH 103 </td></tr>
    <tr><td>6</td><td>Incomplete row</td></tr>
</table>`;

test("academic HTML parsing retains student isolation, normalization and exclusions", () => {
    assert.deepEqual(parseCourseAllotmentsFromHtml(html, 260100001), [
        { original: "CS\u00a0101", normalized: "CS101" },
        { original: "MA 102", normalized: "MA102" },
    ]);
    assert.deepEqual(parseCourseAllotmentsFromHtml(html), {
        260100001: ["CS101", "MA102"],
        260100002: ["PH103"],
    });
    assert.deepEqual(parseCourseAllotmentsFromHtml(html, 260199999), []);
    assert.deepEqual(parseCourseAllotmentsFromHtml("<table></table>"), {});
});
