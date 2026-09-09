import "./support/environment.js";
import assert from "node:assert/strict";
import { test } from "node:test";
import { once } from "node:events";
import fs from "node:fs/promises";
import mongoose from "mongoose";
import { app, server, shutdown } from "../index.js";

test("HTTP fallback, API errors and shutdown preserve completed in-flight responses", async (t) => {
    const disconnected = t.mock.method(mongoose, "disconnect", async () => {});
    const arrived = Promise.withResolvers();
    const release = Promise.withResolvers();
    // POST reaches this fixture after the GET-only SPA fallback.
    app.post("/test-drain", async (req, res) => {
        res.type("text/plain").write("first ");
        arrived.resolve();
        await release.promise;
        res.end("last");
    });
    server.listen(0, "127.0.0.1");
    await once(server, "listening");
    t.after(() => {
        release.resolve();
        server.closeAllConnections();
        server.close();
    });
    const origin = `http://127.0.0.1:${server.address().port}`;
    const html = await fs.readFile(new URL("../static/index.html", import.meta.url), "utf8");
    for (const route of ["/", "/profile?tab=courses", "/browse/CS101/nested/folder"]) {
        const response = await fetch(origin + route);
        assert.equal(response.status, 200);
        assert.match(response.headers.get("content-type"), /text\/html/);
        assert.equal(await response.text(), html);
    }
    for (const route of ["/api/unknown", "/api", "/api/unknown/nested"]) {
        const response = await fetch(origin + route);
        assert.equal(response.status, 404);
        const body = await response.json();
        assert.equal(body.code, "NOT_FOUND");
        assert.equal(body.requestId, response.headers.get("x-request-id"));
    }
    const response = await fetch(origin + "/test-drain", { method: "POST" });
    await arrived.promise;
    const draining = shutdown({ signal: "test", exitCode: 0 });
    assert.equal(server.listening, false);
    assert.equal(disconnected.mock.callCount(), 0);
    assert.equal(shutdown({ signal: "test", exitCode: 0 }), draining);
    release.resolve();
    assert.equal(await response.text(), "first last");
    await draining;
    assert.equal(disconnected.mock.callCount(), 1);
});
