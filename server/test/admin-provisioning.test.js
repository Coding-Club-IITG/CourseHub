import "./support/environment.js";
import { storedPasswordHashes } from "./fixtures/password-hashes.js";
import assert from "node:assert/strict";
import { test } from "node:test";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import Admin from "../modules/admin/admin.model.js";
import { provisionAdmin, validateAdminCredentials } from "../modules/admin/admin.provisioning.js";

const credentials = { userId: "fixture-admin", password: "fixture-only-password-2026" };

for (const [name, input, code] of [
    ["missing credentials", undefined, "INVALID_USER_ID"],
    ["blank user ID", { ...credentials, userId: "  " }, "INVALID_USER_ID"],
    ["control characters in user ID", { ...credentials, userId: "bad\nID" }, "INVALID_USER_ID"],
    ["missing password", { userId: credentials.userId }, "INVALID_PASSWORD"],
    ["short password", { ...credentials, password: "short" }, "INVALID_PASSWORD"],
    ["blank password", { ...credentials, password: " ".repeat(12) }, "INVALID_PASSWORD"],
    [
        "password longer than bcrypt input",
        { ...credentials, password: "x".repeat(73) },
        "INVALID_PASSWORD",
    ],
    [
        "UTF-8 password exceeding bcrypt byte limit",
        { ...credentials, password: "🔒".repeat(19) },
        "INVALID_PASSWORD",
    ],
]) {
    test(`${name} fails before database work`, async (t) => {
        const index = t.mock.method(Admin, "createIndexes", async () =>
            assert.fail("Unexpected index work"),
        );
        const lookup = t.mock.method(Admin, "exists", async () => assert.fail("Unexpected lookup"));
        const create = t.mock.method(Admin, "create", async () =>
            assert.fail("Unexpected creation"),
        );
        await assert.rejects(provisionAdmin(input), { code });
        assert.equal(index.mock.callCount() + lookup.mock.callCount() + create.mock.callCount(), 0);
    });
}

test("user IDs are trimmed, passwords retain their exact whitespace, and the 72-byte boundary is accepted", () => {
    const input = { userId: " fixture-admin ", password: " leading and trailing spaces " };
    assert.deepEqual(validateAdminCredentials(input), { ...input, userId: "fixture-admin" });
    assert.equal(
        validateAdminCredentials({ ...credentials, password: "🔒".repeat(18) }).password,
        "🔒".repeat(18),
    );
});

test("persisted administrator hashes still authenticate without a password reset", async () => {
    for (const { password, hash } of storedPasswordHashes) {
        const admin = new Admin({ userId: "existing-admin", password: hash });
        assert.equal(await admin.comparePassword(password), true);
        assert.equal(await admin.comparePassword("incorrect-password"), false);
        assert.equal(admin.password, hash);
    }
});

test("an existing administrator cannot be reset by provisioning", async (t) => {
    const existing = Object.freeze({
        _id: "existing-id",
        userId: credentials.userId,
        password: "original-hash",
    });
    t.mock.method(Admin, "createIndexes", async () => {});
    t.mock.method(Admin, "exists", async (filter) => {
        assert.deepEqual(filter, { userId: credentials.userId });
        return { _id: existing._id };
    });
    const create = t.mock.method(Admin, "create", async () =>
        assert.fail("Existing administrators must not be saved"),
    );
    await assert.rejects(provisionAdmin(credentials), { code: "ADMIN_EXISTS" });
    assert.equal(create.mock.callCount(), 0);
    assert.equal(existing.password, "original-hash");
});

test("new credentials pass through the real model hashing hook and no hash is returned", async (t) => {
    t.mock.method(Admin, "createIndexes", async () => {});
    t.mock.method(Admin, "exists", async () => null);
    let inserted;
    t.mock.method(Admin.collection, "insertOne", async (document) => {
        inserted = document;
        return { acknowledged: true, insertedId: document._id };
    });
    const result = await provisionAdmin(credentials);
    assert.deepEqual(Object.keys(result).sort(), ["id", "userId"]);
    assert.equal(result.id, inserted._id.toString());
    assert.equal(result.userId, credentials.userId);
    assert.notEqual(inserted.password, credentials.password);
    assert.equal(await new Admin(inserted).comparePassword(credentials.password), true);
    assert.equal(await new Admin(inserted).comparePassword("another-fixture-password"), false);
});

test("a concurrent duplicate is reported without retrying as an update", async (t) => {
    t.mock.method(Admin, "createIndexes", async () => {});
    t.mock.method(Admin, "exists", async () => null);
    const create = t.mock.method(Admin, "create", async () => {
        throw Object.assign(new Error("duplicate"), { code: 11000 });
    });
    const update = t.mock.method(Admin, "updateOne", async () =>
        assert.fail("No update fallback is permitted"),
    );
    await assert.rejects(provisionAdmin(credentials), { code: "ADMIN_EXISTS" });
    assert.equal(create.mock.callCount(), 1);
    assert.equal(update.mock.callCount(), 0);
});

test("an index failure prevents account creation", async (t) => {
    const failure = new Error("Index cannot be created");
    t.mock.method(Admin, "createIndexes", async () => {
        throw failure;
    });
    const create = t.mock.method(Admin, "create", async () => assert.fail("Unexpected write"));
    await assert.rejects(provisionAdmin(credentials), failure);
    assert.equal(create.mock.callCount(), 0);
});

function runProvisioning(env = {}) {
    return spawnSync(
        process.execPath,
        [fileURLToPath(new URL("../scripts/provisionAdmin.js", import.meta.url))],
        {
            encoding: "utf8",
            timeout: 3000,
            env: {
                ...process.env,
                ADMIN_USER_ID: "",
                ADMIN_PASSWORD: "",
                MONGO_URI: "",
                MONGODB_URI: "",
                ...env,
            },
        },
    );
}

test("provisioning requires explicit credentials and database configuration", () => {
    const missingCredentials = runProvisioning();
    assert.equal(missingCredentials.status, 1);
    assert.match(missingCredentials.stderr, /ADMIN_USER_ID/);
    const missingDatabase = runProvisioning({
        ADMIN_USER_ID: credentials.userId,
        ADMIN_PASSWORD: credentials.password,
    });
    assert.equal(missingDatabase.status, 1);
    assert.match(missingDatabase.stderr, /Set MONGO_URI/);
});

test("CLI connection errors do not expose passwords, database URIs or stacks", () => {
    const uri = "invalid-uri-with-fixture-secret";
    const result = runProvisioning({
        ADMIN_USER_ID: credentials.userId,
        ADMIN_PASSWORD: credentials.password,
        MONGO_URI: uri,
    });
    assert.equal(result.error, undefined);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Administrator provisioning failed/);
    assert.equal(result.stdout, "");
    assert.equal(result.stderr.includes(credentials.password), false);
    assert.equal(result.stderr.includes(uri), false);
    assert.doesNotMatch(result.stderr, /\n\s+at /);
});
