import "../support/environment.js";
import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import mongoose from "mongoose";
import { app } from "../../index.js";
import Admin from "../../modules/admin/admin.model.js";
import { provisionAdmin } from "../../modules/admin/admin.provisioning.js";

const owner = randomUUID();
const password = "database-fixture-password-only";
let ownsDatabase = false;
let listener;
let origin;

before(async () => {
    const uri = process.env.TEST_MONGO_URI;
    assert.ok(uri, "Set TEST_MONGO_URI to an empty isolated coursehub_test_ database");
    const target = new URL(uri);
    assert.match(
        decodeURIComponent(target.pathname),
        /^\/coursehub_test_[a-zA-Z0-9_-]+$/,
        "Refusing a database outside the coursehub_test_ namespace",
    );
    await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 5000,
        autoIndex: false,
        autoCreate: false,
    });
    const db = mongoose.connection.db;
    assert.deepEqual(
        await db.listCollections({}, { nameOnly: true }).toArray(),
        [],
        "Refusing a nonempty test database",
    );
    await db.collection("_testRun").insertOne({ _id: "owner", token: owner });
    ownsDatabase = true;

    listener = app.listen(0, "127.0.0.1");
    await once(listener, "listening");
    origin = `http://127.0.0.1:${listener.address().port}`;
});

after(async () => {
    try {
        if (listener) {
            const closed = new Promise((resolve, reject) =>
                listener.close((error) => (error ? reject(error) : resolve())),
            );
            listener.closeAllConnections();
            await closed;
        }
        if (ownsDatabase) {
            const marker = await mongoose.connection.db
                .collection("_testRun")
                .findOne({ _id: "owner" });
            assert.equal(
                marker?.token,
                owner,
                "Refusing cleanup without this run's ownership marker",
            );
            assert.match(mongoose.connection.name, /^coursehub_test_[a-zA-Z0-9_-]+$/);
            await mongoose.connection.db.dropDatabase();
        }
    } finally {
        await mongoose.disconnect();
    }
});

test("provisioned password hashes work with the existing administrator login", async () => {
    const result = await provisionAdmin({ userId: "login-fixture", password });
    const stored = await Admin.findById(result.id);
    assert.notEqual(stored.password, password);
    assert.equal(await stored.comparePassword(password), true);
    assert.equal(await stored.comparePassword("wrong-fixture-password"), false);
    const response = await fetch(origin + "/api/admin/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId: "login-fixture", password }),
    });
    assert.equal(response.status, 200);
    assert.equal((await response.json()).success, true);
    assert.match(response.headers.get("set-cookie"), /adminToken=/);

    const headers = { cookie: response.headers.get("set-cookie").split(";")[0] };
    const session = await fetch(origin + "/api/admin/", { headers });
    assert.equal(session.status, 200);
    assert.deepEqual(await session.json(), { user: { userId: "login-fixture" } });
    const courses = await fetch(origin + "/api/admin/dbcourses", { headers });
    assert.equal(courses.status, 200);
    assert.deepEqual(await courses.json(), []);
});

test("repeat provisioning cannot replace an existing hash or identity", async () => {
    const first = await provisionAdmin({ userId: "existing-fixture", password });
    const original = await Admin.findById(first.id).lean();
    await assert.rejects(
        provisionAdmin({ userId: " existing-fixture ", password: "different-fixture-password" }),
        { code: "ADMIN_EXISTS" },
    );
    assert.deepEqual(await Admin.findById(first.id).lean(), original);
    assert.equal(await Admin.countDocuments({ userId: "existing-fixture" }), 1);
});

test("concurrent provisioning creates one administrator with a unique indexed ID", async () => {
    const outcomes = await Promise.allSettled([
        provisionAdmin({ userId: "concurrent-fixture", password }),
        provisionAdmin({ userId: "concurrent-fixture", password }),
    ]);
    assert.equal(outcomes.filter((o) => o.status === "fulfilled").length, 1);
    assert.equal(outcomes.find((o) => o.status === "rejected").reason.code, "ADMIN_EXISTS");
    assert.equal(await Admin.countDocuments({ userId: "concurrent-fixture" }), 1);
    const index = (await Admin.collection.indexes()).find((i) => i.key.userId === 1);
    assert.equal(index.unique, true);
});

test("the provisioning CLI creates an account and refuses a subsequent reset", async () => {
    const run = (candidate) =>
        spawnSync(
            process.execPath,
            [fileURLToPath(new URL("../../scripts/provisionAdmin.js", import.meta.url))],
            {
                encoding: "utf8",
                timeout: 5000,
                env: {
                    ...process.env,
                    MONGO_URI: process.env.TEST_MONGO_URI,
                    ADMIN_USER_ID: "cli-fixture",
                    ADMIN_PASSWORD: candidate,
                },
            },
        );
    const created = run(password);
    assert.equal(created.error, undefined);
    assert.equal(created.status, 0, created.stderr);
    assert.match(created.stdout, /Created administrator: cli-fixture/);
    assert.equal(created.stdout.includes(password), false);
    const saved = await Admin.findOne({ userId: "cli-fixture" });
    assert.equal(await saved.comparePassword(password), true);
    const original = saved.toObject();
    const repeated = run("different-cli-fixture-password");
    assert.equal(repeated.error, undefined);
    assert.equal(repeated.status, 1);
    assert.match(repeated.stderr, /already exists/);
    assert.deepEqual(await Admin.findById(saved._id).lean(), original);
});

function probeTarget(uri) {
    // Select only the login test so this nested run cannot recurse into
    // these safeguards. Its before hook must refuse the target before fixtures.
    const env = { ...process.env, TEST_MONGO_URI: uri };
    delete env.NODE_TEST_CONTEXT;
    return spawnSync(
        process.execPath,
        [
            "--test",
            "--test-name-pattern=provisioned password hashes",
            fileURLToPath(import.meta.url),
        ],
        {
            encoding: "utf8",
            timeout: 10000,
            env,
        },
    );
}

test("the database suite refuses an application database name before connecting", () => {
    const result = probeTarget("mongodb://127.0.0.1:1/coursehub");
    assert.equal(result.error, undefined);
    assert.equal(result.status, 1);
    assert.match(
        result.stdout + result.stderr,
        /Refusing a database outside the coursehub_test_ namespace/,
    );
});

test("the database suite leaves a nonempty test target intact", async () => {
    const beforeCollections = await mongoose.connection.db
        .listCollections({}, { nameOnly: true })
        .toArray();
    const beforeAdmins = JSON.stringify(await Admin.find({}).sort({ _id: 1 }).lean());
    const result = probeTarget(process.env.TEST_MONGO_URI);
    assert.equal(result.error, undefined);
    assert.equal(result.status, 1);
    assert.match(result.stdout + result.stderr, /Refusing a nonempty test database/);
    assert.deepEqual(
        await mongoose.connection.db.listCollections({}, { nameOnly: true }).toArray(),
        beforeCollections,
    );
    assert.equal(JSON.stringify(await Admin.find({}).sort({ _id: 1 }).lean()), beforeAdmins);
    assert.equal(
        (await mongoose.connection.db.collection("_testRun").findOne({ _id: "owner" })).token,
        owner,
    );
});
