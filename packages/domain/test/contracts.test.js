import assert from "node:assert/strict";
import { test } from "node:test";
import {
    normalizeCourseCode,
    isCourseCode,
    isUploadLimits,
    uploadLimits,
    uploadLimitsLabel,
    uploadLimitsError,
} from "../src/index.js";

test("course identities compare consistently across whitespace and case", () => {
    for (const value of ["cs101", " CS 101 ", "CS\t101"])
        assert.equal(normalizeCourseCode(value), "CS101");
    assert.equal(normalizeCourseCode(null), "");
    assert.equal(normalizeCourseCode(undefined), "");
    assert.equal(isCourseCode("CS3104L"), true);
    assert.equal(isCourseCode("CS_101-A.1"), true);
    for (const value of [null, {}, 123, "", "../CS101", "CS/101", "A".repeat(65)])
        assert.equal(isCourseCode(value), false);
});

test("upload contracts reject incomplete or unsafe limits and describe the actual values", () => {
    assert.equal(isUploadLimits(uploadLimits), true);
    for (const value of [
        null,
        {},
        { ...uploadLimits, files: 0 },
        { ...uploadLimits, fileBytes: 1.5 },
        { ...uploadLimits, batchBytes: Infinity },
    ])
        assert.equal(isUploadLimits(value), false);
    assert.equal(uploadLimitsLabel(), "100 MiB per file · 40 files · 1 GiB per batch");
    const smaller = { ...uploadLimits, files: 2, fileBytes: 1024 ** 2 };
    assert.equal(
        uploadLimitsError(smaller),
        "Choose up to 2 files, no more than 1 MiB each and 1 GiB in total.",
    );
});
