import "./support/environment.js";
import assert from "node:assert/strict";
import { test } from "node:test";
import { validateManifest, temporaryPath } from "../services/uploads.js";
import { uploadLimits } from "../config/storage.js";

test("upload manifests enforce exact byte/count limits and generate independent identities", () => {
    const file = { name: "Lecture notes.pdf", size: uploadLimits.fileBytes };
    assert.equal(validateManifest(Array.from({ length: 10 }, () => file)).length, 10);
    assert.equal(
        validateManifest(Array.from({ length: 40 }, () => ({ ...file, size: 1 }))).length,
        40,
    );
    const full = [...Array.from({ length: 10 }, () => file), { ...file, size: 24 * 1024 * 1024 }];
    assert.equal(
        validateManifest(full).reduce((sum, entry) => sum + entry.size, 0),
        uploadLimits.batchBytes,
    );
    for (const manifest of [
        [{ ...file, size: file.size + 1 }],
        [...full, { ...file, size: 1 }],
        Array.from({ length: 41 }, () => ({ ...file, size: 1 })),
    ])
        assert.throws(() => validateManifest(manifest), { status: 413 });
    for (const manifest of [
        null,
        {},
        [],
        [null],
        [{ ...file, size: 0 }],
        [{ ...file, size: 1.5 }],
        [{ ...file, size: "12" }],
        [{ ...file, approved: true }],
        [{ ...file, fileId: "forged" }],
    ])
        assert.throws(() => validateManifest(manifest), { status: 400 });
    const entries = validateManifest([file, file]);
    assert.notEqual(entries[0].id, entries[1].id);
    assert.notEqual(String(entries[0].fileId), String(entries[1].fileId));
    assert.notEqual(entries[0].remoteName, entries[1].remoteName);
    assert.equal(entries[0].name, file.name);
});

test("display filenames cannot escape storage or masquerade as path identities", () => {
    for (const name of [
        "../notes.pdf",
        "a/b.pdf",
        "a\\b.pdf",
        "..",
        ".",
        "",
        "CON.pdf",
        "COM9",
        "LPT1.txt",
        "trailing.",
        "trailing ",
        "secret\0.pdf",
        "a:b.pdf",
        "x".repeat(241),
    ])
        assert.throws(() => validateManifest([{ name, size: 1 }]), { code: "INVALID_FILENAME" });
    assert.equal(
        validateManifest([{ name: "Lecture १ - résumé.pdf", size: 1 }])[0].name,
        "Lecture १ - résumé.pdf",
    );
    for (const name of ["../example.upload", "/tmp/example.upload", "example.pdf", null])
        assert.throws(() => temporaryPath(name), { status: 400 });
});
