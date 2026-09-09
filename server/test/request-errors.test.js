import "./support/environment.js";
import assert from "node:assert/strict";
import { test } from "node:test";
import fs from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { once } from "node:events";
import express from "express";

import AppError from "../utils/appError.js";
import { requestContext, requestErrorHandler } from "../middleware/requestErrors.js";
import { uploadCourses } from "../modules/admin/adminDashboard.controller.js";
import Course from "../modules/course/course.model.js";
import { cookieOptions, validateSecuritySettings } from "../config/security.js";
import { setSessionCookie, clearSessionCookie } from "../services/sessions.js";

async function serve(t, configure) {
    const app = express();
    app.use(requestContext);
    app.use(express.json());
    configure(app);
    app.use(requestErrorHandler);
    const listener = app.listen(0, "127.0.0.1");
    await once(listener, "listening");
    t.after(async () => {
        listener.closeAllConnections();
        await new Promise((resolve) => listener.close(resolve));
    });
    return `http://127.0.0.1:${listener.address().port}`;
}

test("sync and async handler failures return one safe JSON response and the process serves the next request", async (t) => {
    const origin = await serve(t, (app) => {
        app.get("/sync", () => {
            throw new Error("secret-db-host");
        });
        app.get("/async", async () => {
            await Promise.resolve();
            throw Object.assign(new Error("graph-provider-secret"), { isAxiosError: true });
        });
        app.get("/invalid", async () => {
            throw new AppError(403, "Permission denied", "ACCESS_DENIED");
        });
        app.get("/health", (req, res) => res.json({ ok: true }));
    });
    for (const [route, status, code] of [
        ["sync", 500, "INTERNAL_ERROR"],
        ["async", 502, "PROVIDER_UNAVAILABLE"],
        ["invalid", 403, "ACCESS_DENIED"],
    ]) {
        const response = await fetch(`${origin}/${route}`);
        assert.equal(response.status, status);
        const data = await response.json();
        assert.equal(data.code, code);
        assert.equal(data.requestId, response.headers.get("x-request-id"));
        assert.doesNotMatch(JSON.stringify(data), /secret|stack/);
        assert.equal((await fetch(origin + "/health")).status, 200);
    }
});

test("invalid JSON and old direct-error responses follow the same safe error contract", async (t) => {
    const origin = await serve(t, (app) => {
        app.post("/json", (req, res) => res.json(req.body));
        app.get("/direct", (req, res) =>
            res.status(500).json({ error: "private provider detail", stack: "sensitive-stack" }),
        );
        app.get("/bad", (req, res) => res.sendStatus(400));
    });
    for (const [route, options, status] of [
        [
            "json",
            {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: "{invalid-secret",
            },
            400,
        ],
        ["direct", {}, 500],
        ["bad", {}, 400],
    ]) {
        const response = await fetch(origin + "/" + route, options);
        assert.equal(response.status, status);
        const data = await response.json();
        assert.ok(data.code);
        assert.ok(data.message);
        assert.ok(data.requestId);
        assert.doesNotMatch(JSON.stringify(data), /private|sensitive|invalid-secret/);
    }
});

test("CSV stream and database failures finish the request and clean up the temporary upload", async (t) => {
    const dir = await fs.mkdtemp(path.join(tmpdir(), "coursehub-csv-"));
    t.after(() => fs.rm(dir, { recursive: true, force: true }));
    const file = path.join(dir, "upload.csv");
    await fs.writeFile(file, "QA101,Test Course\n");
    const mock = t.mock.method(Course, "findOne", async () => {
        throw new Error("private database details");
    });
    const origin = await serve(t, (app) => {
        app.post(
            "/csv",
            (req, res, next) => {
                req.file = { path: file };
                next();
            },
            uploadCourses,
        );
    });
    const failed = await fetch(origin + "/csv", { method: "POST" });
    assert.equal(failed.status, 500);
    assert.doesNotMatch(await failed.text(), /private database/);
    await assert.rejects(fs.stat(file), { code: "ENOENT" });
    mock.mock.restore();
    const missing = await fetch(origin + "/csv", { method: "POST" });
    assert.equal(missing.status, 500);
    assert.doesNotMatch(await missing.text(), new RegExp(dir));
});

test("production cookie creation and clearing use matching secure attributes", () => {
    const previous = { node: process.env.NODE_ENV, sameSite: process.env.COOKIE_SAME_SITE };
    process.env.NODE_ENV = "production";
    process.env.COOKIE_SAME_SITE = "none";
    try {
        assert.deepEqual(cookieOptions(), {
            httpOnly: true,
            secure: true,
            sameSite: "none",
            path: "/",
        });
        const calls = [];
        const res = {
            cookie: (name, token, options) => calls.push({ name, options }),
            clearCookie: (name, options) => calls.push({ name, options }),
        };
        for (const role of ["student", "admin"]) {
            setSessionCookie(res, role, "synthetic");
            clearSessionCookie(res, role);
        }
        for (const index of [0, 2]) {
            const { maxAge, ...attributes } = calls[index].options;
            assert.deepEqual(attributes, calls[index + 1].options);
            assert.equal(calls[index].name, calls[index + 1].name);
            assert.ok(maxAge > 0);
        }
        process.env.NODE_ENV = "development";
        assert.throws(validateSecuritySettings, /production HTTPS/);
    } finally {
        process.env.NODE_ENV = previous.node;
        if (previous.sameSite === undefined) delete process.env.COOKIE_SAME_SITE;
        else process.env.COOKIE_SAME_SITE = previous.sameSite;
    }
});
