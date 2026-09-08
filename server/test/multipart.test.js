import "./support/environment.js";
import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { fork } from "node:child_process";
import { once } from "node:events";
import fs from "node:fs/promises";
import http from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";

let child;
let directory;
let origin;
let output = "";
before(async () => {
    directory = await fs.mkdtemp(path.join(tmpdir(), "coursehub-multipart-"));
    child = fork(new URL("./fixtures/multipart-server.js", import.meta.url), [directory], {
        stdio: ["ignore", "pipe", "pipe", "ipc"],
    });
    for (const stream of [child.stdout, child.stderr]) {
        stream.on("data", (data) => {
            output = (output + data).slice(-12000);
        });
    }
    const [message] = await once(child, "message", { signal: AbortSignal.timeout(5000) });
    origin = message.origin;
});
after(async () => {
    if (child?.exitCode === null) {
        const exited = once(child, "exit");
        child.kill("SIGKILL");
        await exited;
    }
    if (directory) await fs.rm(directory, { recursive: true, force: true });
});

async function send(route, body, headers) {
    assert.equal(child.exitCode, null, output);
    return fetch(origin + route, {
        method: "POST",
        body,
        headers,
        signal: AbortSignal.timeout(3000),
    });
}
const health = async () => {
    const response = await fetch(origin + "/health", { signal: AbortSignal.timeout(1500) });
    assert.equal(response.status, 200, output);
    return response.json();
};
async function waitFor(predicate) {
    for (let attempt = 0; attempt < 50; attempt++) {
        const state = await health();
        if (predicate(state)) return state;
        await delay(10);
    }
    assert.fail("Multipart work did not settle: " + JSON.stringify(await health()));
}
async function assertClean() {
    await waitFor((state) => state.activeWrites === 0 && state.files.length === 0);
}
function files(contents, field = "file") {
    const body = new FormData();
    for (const content of contents) {
        body.append(field, new Blob([content], { type: "application/pdf" }), "notes.pdf");
    }
    return body;
}
async function rejected(route, body, status, headers) {
    const before = await health();
    const response = await send(route, body, headers);
    assert.equal(response.status, status, output);
    const error = await response.json();
    assert.ok(error.code);
    assert.equal(error.requestId, response.headers.get("x-request-id"));
    assert.doesNotMatch(JSON.stringify(error), /stack|private-storage|Unexpected end|Boundary/);
    assert.equal(
        (await health()).completed,
        before.completed,
        "Rejected input reached the handler",
    );
    await assertClean();
}

test("FilePond flat metadata, repeated files and the exact byte limit retain disk-storage behavior", async () => {
    const body = files(["12345678", "second"]);
    body.append("file", JSON.stringify({ id: "pond-fixture" }));
    const response = await send("/multiple", body);
    assert.equal(response.status, 200);
    const data = await response.json();
    assert.deepEqual(data.fields, { file: '{"id":"pond-fixture"}' });
    assert.deepEqual(
        data.files.map((file) => file.content),
        ["12345678", "second"],
    );
    assert.deepEqual(
        data.files.map((file) => file.size),
        [8, 6],
    );
    assert.equal(new Set(data.files.map((file) => file.filename)).size, 2);
    for (const file of data.files) {
        assert.equal(file.originalname, "notes.pdf");
        assert.match(file.filename, /^[a-f0-9]{32}$/);
        assert.equal(file.contained, true);
    }
    await assertClean();
});

test("single CSV uploads accept one file and reject unexpected fields or a second file", async () => {
    const body = new FormData();
    body.append("file", new Blob(["A,Name\n"], { type: "text/csv" }), "courses.csv");
    const response = await send("/single", body);
    assert.equal(response.status, 200);
    assert.equal((await response.json()).files[0].content, "A,Name\n");
    await assertClean();
    await rejected("/single", files(["one", "two"]), 400);
    await rejected("/multiple", files(["one"], "unexpected"), 400);
});

test("file byte/count and text field limits reject input and remove already-written files", async () => {
    await rejected("/multiple", files(["valid", "123456789"]), 413);
    await rejected("/multiple", files(["one", "two", "three"]), 400);
    const body = files(["valid"]);
    body.append("description", "a".repeat(65));
    await rejected("/multiple", body, 400);
    const fields = new FormData();
    for (let index = 0; index < 5; index++) fields.append("field" + index, "text");
    await rejected("/multiple", fields, 400);
});

test("crafted array indexes, sparse-array growth and deep field names cannot crash or stall the process", async () => {
    for (const names of [
        ["items[4294967294]", "items[]"],
        ["items[4294967294]", "items[key]"],
        ["items" + "[nested]".repeat(1000)],
    ]) {
        const body = new FormData();
        for (const name of names) body.append(name, "text");
        await rejected("/multiple", body, 400);
    }
    const response = await send("/multiple", files(["healthy"]));
    assert.equal(response.status, 200);
    await response.json();
    await assertClean();
});

test("missing boundaries, malformed headers and truncated multipart bodies return safe client errors", async () => {
    await rejected("/multiple", "invalid", 400, { "content-type": "multipart/form-data" });
    const headers = { "content-type": "multipart/form-data; boundary=fixture" };
    await rejected(
        "/multiple",
        "--fixture\r\ninvalid header\r\n\r\ndata\r\n--fixture--\r\n",
        400,
        headers,
    );
    await rejected(
        "/multiple",
        '--fixture\r\nContent-Disposition: form-data; name="file"; filename="notes.pdf"\r\n\r\ndata',
        400,
        headers,
    );
});

test("aborted disk uploads release file descriptors and temporary files before the next upload", async () => {
    for (let attempt = 0; attempt < 3; attempt++) {
        const before = await health();
        const request = http.request(origin + "/interrupt", {
            method: "POST",
            headers: {
                "content-type": "multipart/form-data; boundary=fixture",
                "content-length": 1024 * 1024,
            },
        });
        request.on("error", () => {});
        try {
            request.write(
                '--fixture\r\nContent-Disposition: form-data; name="file"; filename="notes.pdf"\r\n\r\n',
            );
            request.write(Buffer.alloc(4096, "a"));
            await waitFor((state) => state.activeWrites > 0 && state.files.length > 0);
        } finally {
            // Aborting intentionally emits ECONNRESET before close
            const closed = new Promise((resolve) => request.once("close", resolve));
            request.destroy();
            await closed;
        }
        await waitFor((state) => state.errors > before.errors);
        await assertClean();
        assert.equal((await health()).completed, before.completed);
    }
    const response = await send("/multiple", files(["healthy"]));
    assert.equal(response.status, 200);
    await response.json();
    await assertClean();
});

test("disk failures remain server errors with safe responses", async () => {
    await rejected("/storage-failure", files(["data"]), 500);
});
