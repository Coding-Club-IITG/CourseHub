import "./support/environment.js";
import assert from "node:assert/strict";
import { test } from "node:test";
import https from "node:https";
import axios from "axios";
import { academicProvider, parseAcademicSnapshot } from "../services/academicPortal.js";

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

test("prefixed portal identities stay distinct from numeric student registrations", () => {
    const html = `<table>${header}
        <tr><td>1</td><td>A</td><td>260100001</td><td>CS101</td></tr>
        <tr><td>2</td><td>B</td><td>X260100001</td><td>PH103</td></tr></table>`;
    assert.deepEqual(parseAcademicSnapshot(html), {
        260100001: ["CS101"],
        X260100001: ["PH103"],
    });
    for (const roll of ["X260100001extra", "X26010000", "X2601000010"])
        assert.throws(
            () =>
                parseAcademicSnapshot(
                    `<table>${header}<tr><td>1</td><td>B</td><td>${roll}</td><td>PH103</td></tr></table>`,
                ),
            { code: "ACADEMIC_INVALID_RESPONSE" },
        );
});

test("the academic request deadline also aborts a stalled DNS lookup", async (t) => {
    let lookedUp = false;
    const agent = new https.Agent({
        lookup() {
            lookedUp = true;
            // Deliberately never resolve: no socket has connected or received a response.
        },
    });
    const defaults = axios.defaults.httpsAgent;
    axios.defaults.httpsAgent = agent;
    const deadline = new AbortController();
    t.mock.method(AbortSignal, "timeout", (milliseconds) => {
        assert.equal(milliseconds, 30000);
        return deadline.signal;
    });
    const timer = setTimeout(() => deadline.abort(new Error("deadline reached")), 50);
    t.after(() => {
        clearTimeout(timer);
        agent.destroy();
        axios.defaults.httpsAgent = defaults;
    });
    await assert.rejects(academicProvider.fetch({ year: 2026, session: "July-Nov" }), {
        code: "ACADEMIC_UNAVAILABLE",
        message: "The academic service is unavailable. Saved courses are preserved.",
    });
    assert.equal(lookedUp, true);
});
