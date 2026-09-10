import assert from "node:assert/strict";
import { test } from "node:test";
import { parseImportCsv, validateImportRows } from "../src/index.js";
test("CSV parsing preserves quoted commas/newlines/quotes, handles BOMs and blank records", () => {
    const result = parseImportCsv(
        '\ufeffcode,name\r\n\r\n cs 101 ,"Analysis, examples\nand ""proofs"""\r\n,\r\n',
        "courses",
    );
    assert.deepEqual(result.errors, []);
    assert.deepEqual(result.rows, [
        { row: 3, code: "CS101", name: 'Analysis, examples\nand "proofs"' },
    ]);
});
test("identical duplicates are skipped consistently and conflicting names require correction", () => {
    const rows = parseImportCsv("code,name\nCS 101,First\ncs101,First\n", "courses");
    assert.equal(rows.rows[1].duplicateOf, 2);
    assert.deepEqual(validateImportRows("courses", rows.rows), rows);
    assert.equal(
        parseImportCsv("code,name\nCS101,First\ncs101,Second", "courses").errors.length,
        1,
    );
    const br = parseImportCsv('email\n"BR@EXAMPLE.TEST"\nbr@example.test', "brs");
    assert.equal(br.rows[1].duplicateOf, 2);
    assert.deepEqual(validateImportRows("brs", br.rows), br);
});
test("malformed CSV, wrong columns, invalid records and oversized plans fail before submission", () => {
    for (const text of [
        'code,name\nCS101,"unclosed',
        "code,name\nCS101,Name,extra",
        "name,name\nName,Name",
        "code,name\n../bad,Name",
        "code,name\nCS101,",
        "code,name\nCS101," + "a".repeat(201),
    ])
        assert.ok(parseImportCsv(text, "courses").errors.length);
    assert.ok(parseImportCsv("email\ninvalid", "brs").errors.length);
    assert.ok(
        validateImportRows("courses", Array(1001).fill({ code: "CS101", name: "Name" })).errors
            .length,
    );
    assert.ok(parseImportCsv("a".repeat(1024 * 1024 + 1), "courses").errors.length);
    assert.ok(
        validateImportRows("brs", [{ email: { toString: () => "bad@example.test" } }]).errors
            .length,
    );
});
