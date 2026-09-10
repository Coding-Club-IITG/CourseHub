import { test } from "node:test";
import assert from "node:assert/strict";
import { createTransport } from "../src/transport.js";
const reply = (data, status = 200) =>
    new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
const transport = (fetchImpl) =>
    createTransport({ baseUrl: "https://api.example.test/api/", role: "student", fetchImpl });

test("both read and write requests include credentials and role; a write shares the session token", async () => {
    const calls = [];
    const api = transport(async (url, options) => {
        calls.push({ url, ...options });
        return reply({ csrfToken: "session-token" });
    });
    assert.deepEqual(await api.json("user"), { csrfToken: "session-token" });
    await api.json("folder/create", { method: "POST" });
    assert.equal(calls.length, 2);
    for (const call of calls) {
        assert.equal(call.credentials, "include");
        assert.equal(call.headers.get("X-Session-Role"), "student");
    }
    assert.equal(calls[1].headers.get("X-CSRF-Token"), "session-token");
});
test("concurrent writes refresh CSRF once, and only CSRF rejection retries a mutation", async () => {
    let refreshes = 0,
        writes = 0;
    const api = transport(async (url, options) => {
        if (url.includes("auth/csrf")) {
            refreshes++;
            return reply({ csrfToken: "fresh" });
        }
        writes++;
        return options.headers.get("X-CSRF-Token") === "stale"
            ? reply({ code: "CSRF_INVALID" }, 403)
            : reply({ saved: true });
    });
    await Promise.all([api.json("save", { method: "POST" }), api.json("save", { method: "POST" })]);
    assert.equal(refreshes, 1);
    api.setCsrfToken("stale");
    await api.json("save", { method: "POST" });
    assert.equal(refreshes, 2);
    assert.equal(writes, 4);
});
test("403, 404 and 500 retain error codes and request IDs without signing out or retrying", async () => {
    for (const status of [403, 404, 500]) {
        let calls = 0,
            signedOut = false;
        const api = transport(async () => {
            calls++;
            return reply(
                {
                    code: "DENIED",
                    message: "Safe message",
                    requestId: "request-1",
                    fieldErrors: { name: "A name is required" },
                },
                status,
            );
        });
        api.setCsrfToken("token");
        api.onUnauthorized(() => {
            signedOut = true;
        });
        await assert.rejects(
            api.json("save", { method: "POST" }),
            (error) =>
                error.status === status &&
                error.message === "Safe message" &&
                error.code === "DENIED" &&
                error.requestId === "request-1" &&
                error.fieldErrors.name === "A name is required",
        );
        assert.equal(calls, 1);
        assert.equal(signedOut, false);
    }
});
test("401 ends the session; invalid administrator credentials only reject login", async () => {
    const api = transport(async () => reply({}, 401));
    let ended = 0;
    api.onUnauthorized(() => ended++);
    await assert.rejects(api.json("admin/auth/login", { method: "POST" }));
    assert.equal(ended, 0);
    await assert.rejects(api.json("user"));
    assert.equal(ended, 1);
});
test("aborting a write while it waits for CSRF prevents the write and leaves other consumers usable", async () => {
    let release,
        writes = 0;
    const wait = new Promise((resolve) => {
        release = resolve;
    });
    const api = transport(async (url) => {
        if (url.includes("csrf")) {
            await wait;
            return reply({ csrfToken: "fresh" });
        }
        writes++;
        return reply({});
    });
    const controller = new AbortController();
    const aborted = api.json("save", { method: "POST", signal: controller.signal });
    const surviving = api.json("save", { method: "POST" });
    controller.abort();
    await assert.rejects(aborted, { name: "AbortError" });
    release();
    await surviving;
    assert.equal(writes, 1);
});
test("network failures, HTML fallthrough and foreign URLs reject with safe errors", async () => {
    const api = transport(async () => {
        throw new Error("secret provider details");
    });
    await assert.rejects(
        api.json("user"),
        (error) => error.code === "NETWORK_ERROR" && !error.message.includes("secret"),
    );
    await assert.rejects(api.json("https://foreign.test/api/user"), { status: 400 });
    const html = transport(async () => new Response("<html>SPA</html>"));
    await assert.rejects(html.json("user"), { code: "INVALID_RESPONSE" });
});
test("a response started before logout cannot restore the previous actor", async () => {
    let release;
    const waiting = new Promise((resolve) => {
        release = resolve;
    });
    const api = transport(async () => {
        await waiting;
        return reply({ _id: "previous-user", csrfToken: "old" });
    });
    const request = api.json("user");
    await Promise.resolve();
    api.endSession();
    release();
    await assert.rejects(request, { name: "AbortError" });
});
test("concurrent rejected CSRF tokens share their replacement request", async () => {
    let refreshes = 0;
    const api = transport(async (url, options) => {
        if (url.includes("csrf")) {
            refreshes++;
            return reply({ csrfToken: "new" });
        }
        return options.headers.get("X-CSRF-Token") === "old"
            ? reply({ code: "CSRF_INVALID" }, 403)
            : reply({});
    });
    api.setCsrfToken("old");
    await Promise.all([api.json("save", { method: "POST" }), api.json("save", { method: "POST" })]);
    assert.equal(refreshes, 1);
});

test("relative API bases resolve against the browser origin and retain destination boundaries", async () => {
    for (const baseUrl of ["/api/", "/backend/api/"]) {
        const calls = [];
        const api = createTransport({
            baseUrl,
            role: "admin",
            origin: "http://localhost:5174",
            fetchImpl: async (url, options) => {
                calls.push({ url, options });
                return reply({ user: { userId: "admin" } });
            },
        });
        await api.json("admin/");
        assert.equal(calls[0].url, "http://localhost:5174" + baseUrl + "admin/");
        assert.equal(calls[0].options.credentials, "include");
        assert.equal(calls[0].options.headers.get("X-Session-Role"), "admin");
        await assert.rejects(
            api.json("https://unrelated.example.test/api/admin/"),
            (error) => error.status === 400,
        );
        await assert.rejects(api.json("../outside"), (error) => error.status === 400);
        assert.equal(calls.length, 1);
    }
});
test("an absolute API base keeps its configured origin when a browser origin is supplied", async () => {
    let requested;
    const api = createTransport({
        baseUrl: "http://localhost:8080/api",
        origin: "http://localhost:5174",
        role: "student",
        fetchImpl: async (url) => {
            requested = url;
            return reply({});
        },
    });
    await api.json("user");
    assert.equal(requested, "http://localhost:8080/api/user");
});
