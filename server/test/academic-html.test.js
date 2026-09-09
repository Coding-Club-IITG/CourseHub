import "./support/environment.js";
import assert from "node:assert/strict";
import { test } from "node:test";
import { parseAcademicSnapshot } from "../services/academicPortal.js";

const header = "<tr><th>No.</th><th>Name</th><th>Roll</th><th>Course</th></tr>";
test("academic snapshots normalize and deduplicate courses without mixing students", () => {
    const html = `<table>${header}
        <tr><td>1</td><td>A</td><td>260100001</td><td> CS&nbsp;101 </td></tr>
        <tr><td>2</td><td>A</td><td>260100001</td><td>cs101</td></tr>
        <tr><td>3</td><td>A</td><td>260100001</td><td>sa 101</td></tr>
        <tr><td>4</td><td>B</td><td>260100002</td><td>PH 103</td></tr></table>`;
    assert.deepEqual(parseAcademicSnapshot(html), { 260100001: ["CS101"], 260100002: ["PH103"] });
    assert.deepEqual(parseAcademicSnapshot(`<table>${header}</table>`), {});
});
test("a login page, partial row or malformed roll is not accepted as an empty course snapshot", () => {
    for (const html of [
        "<form>Sign in</form>",
        "<table></table>",
        `<table>${header}<tr><td>1</td><td>Partial</td></tr></table>`,
        `<table>${header}<tr><td>1</td><td>A</td><td>260100001forged</td><td>CS101</td></tr></table>`,
    ])
        assert.throws(() => parseAcademicSnapshot(html), { code: "ACADEMIC_INVALID_RESPONSE" });
});
