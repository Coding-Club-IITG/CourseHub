import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import axios from "axios";
import { graph } from "../../services/graphClient.js";
import jwt from "jsonwebtoken";
import User from "../../modules/user/user.model.js";
import Admin from "../../modules/admin/admin.model.js";
import Session from "../../modules/session/session.model.js";
import { OAuthAttempt } from "../../services/oauth.js";
import { AuthRateLimit } from "../../middleware/authThrottle.js";
import { createSession, readSession } from "../../services/sessions.js";
import { sessionHeaders, testOrigin } from "../fixtures/sessions.js";
import { student } from "../fixtures/library.js";

export async function exerciseSessionSecurity(t, origin) {
    const { _id, ...base } = student;
    const person = await User.create({
        ...base,
        name: "Session Student",
        email: "session@example.test",
        rollNumber: 298123456,
    });

    const admin = await Admin.create({
        userId: "session-admin",
        password: "session-admin-test-password",
    });
    const send = (url, options = {}) =>
        fetch(origin + url, { signal: AbortSignal.timeout(5000), redirect: "manual", ...options });
    const jsonHeaders = (headers) => ({ ...headers, "content-type": "application/json" });

    await t.test(
        "session claims and database expiration agree with 24-day student and seven-day admin cookies",
        async () => {
            for (const [actor, role, days] of [
                [person, "student", 24],
                [admin, "admin", 7],
            ]) {
                const { token, session } = await createSession(actor.id, role);
                const claims = jwt.decode(token);
                assert.equal(claims.exp - claims.iat, days * 86400);
                assert.equal(claims.exp * 1000, session.expiresAt.getTime());
                assert.equal(claims.role, role);
                assert.equal(claims.sub, actor.id);
                assert.equal(claims.jti, session.id);
                assert.ok(await readSession(token, role));
                assert.equal(
                    await readSession(token, role === "student" ? "admin" : "student"),
                    null,
                );
            }
            await Session.createIndexes();
            assert.equal(
                (await Session.collection.indexes()).find((i) => i.key.expiresAt)
                    .expireAfterSeconds,
                0,
            );
        },
    );

    await t.test(
        "expired, revoked and missing persisted sessions are denied even while a signed JWT remains valid",
        async () => {
            for (const state of ["expired", "revoked", "missing"]) {
                const { token, session } = await createSession(person.id, "student");
                if (state === "expired")
                    await Session.updateOne(
                        { _id: session.id },
                        { $set: { expiresAt: new Date(0) } },
                    );
                if (state === "revoked")
                    await Session.updateOne(
                        { _id: session.id },
                        { $set: { revokedAt: new Date() } },
                    );
                if (state === "missing") await Session.deleteOne({ _id: session.id });
                assert.equal(
                    (await send("/api/user", { headers: { cookie: `token=${token}` } })).status,
                    401,
                );
            }
        },
    );

    await t.test(
        "student and administrator cookies coexist with distinct identities and CSRF tokens",
        async () => {
            const studentHeaders = await sessionHeaders(person.id);
            const adminHeaders = await sessionHeaders(admin.id, "admin");
            for (const [path, headers] of [["/api/admin/", studentHeaders], ["/api/user", adminHeaders]]) {
                const response = await send(path, { headers });
                assert.equal(response.status, 403);
                assert.equal(response.headers.get("set-cookie"), null);
            }
            const cookie = studentHeaders.cookie + "; " + adminHeaders.cookie;
            const studentResponse = await send("/api/user", { headers: { ...studentHeaders, cookie } });
            assert.equal(studentResponse.status, 200);
            const studentData = await studentResponse.json();
            assert.equal(studentData._id, person.id);
            assert.equal(studentData.csrfToken, studentHeaders["x-csrf-token"]);
            const adminResponse = await send("/api/admin/", { headers: { ...adminHeaders, cookie } });
            assert.equal(adminResponse.status, 200);
            const adminData = await adminResponse.json();
            assert.equal(adminData.user.userId, admin.userId);
            assert.equal(adminData.csrfToken, adminHeaders["x-csrf-token"]);
            assert.notEqual(studentData.csrfToken, adminData.csrfToken);
            for (const [role, headers] of [["student", studentHeaders], ["admin", adminHeaders]]) {
                const csrf = await send(`/api/auth/csrf?role=${role}`, { headers: { ...headers, cookie } });
                assert.equal((await csrf.json()).csrfToken, headers["x-csrf-token"]);
            }
            const login = await send("/api/admin/auth/login", {
                method: "POST",
                headers: jsonHeaders(studentHeaders),
                body: JSON.stringify({ userId: admin.userId, password: "session-admin-test-password" }),
            });
            assert.equal(login.status, 200);
            assert.equal(login.headers.getSetCookie().length, 1);
            assert.match(login.headers.get("set-cookie"), /^adminToken=/);
            assert.equal((await send("/api/user", { headers: studentHeaders })).status, 200);
        },
    );

    await t.test(
        "logout with both cookies revokes only the selected role and leaves the other role usable",
        async () => {
            for (const role of ["student", "admin"]) {
                const headers = {
                    student: await sessionHeaders(person.id),
                    admin: await sessionHeaders(admin.id, "admin"),
                };
                const cookie = headers.student.cookie + "; " + headers.admin.cookie;
                const path = role === "student" ? "/api/auth/logout" : "/api/admin/auth/logout";
                const response = await send(path, { method: "POST", headers: { ...headers[role], cookie } });
                assert.equal(response.status, 200);
                assert.equal(response.headers.getSetCookie().length, 1);
                assert.ok(response.headers.get("set-cookie").startsWith(role === "student" ? "token=" : "adminToken="));
                for (const [requested, readPath] of [["student", "/api/user"], ["admin", "/api/admin/"]]) {
                    const read = await send(readPath, { headers: { ...headers[requested], cookie } });
                    assert.equal(read.status, requested === role ? 403 : 200);
                }
            }
        },
    );

    await t.test(
        "student and admin logout revoke only the selected session and prevent cookie/bearer replay",
        async () => {
            for (const [actor, role, path, readPath] of [
                [person, "student", "/api/auth/logout", "/api/user"],
                [admin, "admin", "/api/admin/auth/logout", "/api/admin/"],
            ]) {
                const headers = await sessionHeaders(actor.id, role);
                const second = await sessionHeaders(actor.id, role);
                const response = await send(path, { method: "POST", headers });
                assert.equal(response.status, 200);
                assert.match(
                    response.headers.get("set-cookie"),
                    /Path=\/; Expires=Thu, 01 Jan 1970/,
                );
                assert.match(response.headers.get("set-cookie"), /HttpOnly; SameSite=Lax/);
                assert.equal((await send(readPath, { headers })).status, 401);
                assert.equal(
                    (
                        await send(readPath, {
                            headers: { authorization: `Bearer ${headers.cookie.split("=")[1]}` },
                        })
                    ).status,
                    401,
                );
                assert.equal((await send(readPath, { headers: second })).status, 200);
            }
        },
    );

    await t.test(
        "CSRF and exact origins reject cross-site writes before any profile persistence",
        async () => {
            const headers = await sessionHeaders(person.id);
            const original = (await User.findById(person.id)).name;
            for (const altered of [
                { "x-csrf-token": undefined },
                { "x-csrf-token": "x".repeat(43) },
                { "x-csrf-token": "é".repeat(43) },
                { origin: "https://attacker.example" },
                { origin: `${testOrigin}.attacker.example` },
                { origin: "null" },
                { origin: undefined },
            ]) {
                const candidate = Object.fromEntries(
                    Object.entries({ ...headers, ...altered }).filter(
                        ([, value]) => value !== undefined,
                    ),
                );
                const response = await send("/api/user/update", {
                    method: "PUT",
                    headers: jsonHeaders(candidate),
                    body: JSON.stringify({ newUserData: { newUserName: "Forged" } }),
                });
                assert.equal(response.status, 403, JSON.stringify(altered));
                assert.equal((await User.findById(person.id)).name, original);
            }
            const csrf = await send("/api/auth/csrf?role=student", { headers });
            assert.equal((await csrf.json()).csrfToken, headers["x-csrf-token"]);
            assert.match(csrf.headers.get("cache-control"), /no-store/);
            const update = await send("/api/user/update", {
                method: "PUT",
                headers: jsonHeaders(headers),
                body: JSON.stringify({ newUserData: { newUserName: "Saved Student" } }),
            });
            assert.equal(update.status, 200);
            assert.deepEqual(await update.json(), {
                name: "Saved Student",
                semester: person.semester,
            });
            assert.equal((await User.findById(person.id)).name, "Saved Student");
        },
    );

    await t.test(
        "CSRF tokens cannot be transferred between sessions; cookie and bearer precedence cannot bypass CSRF",
        async () => {
            const studentHeaders = await sessionHeaders(person.id);
            const adminHeaders = await sessionHeaders(admin.id, "admin");
            const response = await send("/api/user/update", {
                method: "PUT",
                headers: jsonHeaders({
                    ...studentHeaders,
                    "x-csrf-token": adminHeaders["x-csrf-token"],
                    authorization: `Bearer ${adminHeaders.cookie.split("=")[1]}`,
                }),
                body: JSON.stringify({ newUserData: { newUserName: "Forged" } }),
            });
            assert.equal(response.status, 403);
            const combined = {
                ...adminHeaders,
                cookie: studentHeaders.cookie + "; " + adminHeaders.cookie,
            };
            const created = await send("/api/course/create/SESSION101", {
                method: "POST",
                headers: jsonHeaders(combined),
                body: JSON.stringify({ name: "Admin with two browser sessions" }),
            });
            assert.equal(created.status, 201);
        },
    );

    await t.test(
        "profile validation rejects permission fields and invalid edits without changing the document",
        async () => {
            const headers = jsonHeaders(await sessionHeaders(person.id));
            const before = await User.findById(person.id).lean();
            for (const newUserData of [
                { newUserName: " " },
                { newUserSem: 1.5 },
                { isBR: true },
                { courses: ["SESSION101"] },
                { newUserName: "N", uploadedBy: admin.id },
                {},
            ]) {
                const response = await send("/api/user/update", {
                    method: "PUT",
                    headers,
                    body: JSON.stringify({ newUserData }),
                });
                assert.equal(response.status, 400);
                const body = await response.json();
                assert.equal(body.code, "VALIDATION_FAILED");
                assert.ok(body.fieldErrors);
            }
            assert.deepEqual(await User.findById(person.id).lean(), before);
        },
    );

    await t.test(
        "database failures return a safe response with a matching request ID and permit a later successful save",
        async (st) => {
            const headers = jsonHeaders(await sessionHeaders(person.id));
            const mock = st.mock.method(User, "findByIdAndUpdate", async () => {
                throw new Error("mongodb://private-password@internal-host provider diagnostic");
            });
            const response = await send("/api/user/update", {
                method: "PUT",
                headers,
                body: JSON.stringify({ newUserData: { newUserName: "Retry Student" } }),
            });
            assert.equal(response.status, 500);
            const body = await response.json();
            assert.equal(body.code, "INTERNAL_ERROR");
            assert.equal(body.requestId, response.headers.get("x-request-id"));
            assert.doesNotMatch(
                JSON.stringify(body),
                /private-password|internal-host|stack|diagnostic/,
            );
            mock.mock.restore();
            const retry = await send("/api/user/update", {
                method: "PUT",
                headers,
                body: JSON.stringify({ newUserData: { newUserName: "Retry Student" } }),
            });
            assert.equal(retry.status, 200);
            assert.equal((await retry.json()).name, "Retry Student");
        },
    );

    await t.test(
        "missing synchronization metadata leaves the session authenticated and reports synchronization needed",
        async () => {
            const headers = await sessionHeaders(person.id);
            await User.updateOne({ _id: person._id }, { $unset: { courseSync: 1 } });
            const response = await send("/api/user", { headers });
            assert.equal(response.status, 200);
            assert.equal((await response.json()).needsCourseSync, true);
            assert.equal(response.headers.get("set-cookie"), null);
        },
    );

    await t.test(
        "admin login rejects forged origins and object credentials, and sets an expiring cookie",
        async () => {
            const body = JSON.stringify({
                userId: admin.userId,
                password: "session-admin-test-password",
            });
            for (const originHeader of [undefined, "https://attacker.example", "null"]) {
                const response = await send("/api/admin/auth/login", {
                    method: "POST",
                    headers: {
                        "content-type": "application/json",
                        ...(originHeader ? { origin: originHeader } : {}),
                    },
                    body,
                });
                assert.equal(response.status, 403);
            }
            const invalid = await send("/api/admin/auth/login", {
                method: "POST",
                headers: { "content-type": "application/json", origin: testOrigin },
                body: JSON.stringify({ userId: { $ne: null }, password: "secret" }),
            });
            assert.equal(invalid.status, 400);
            const response = await send("/api/admin/auth/login", {
                method: "POST",
                headers: { "content-type": "application/json", origin: testOrigin },
                body,
            });
            assert.equal(response.status, 200);
            assert.match(response.headers.get("set-cookie"), /Max-Age=604800/);
            assert.match(response.headers.get("set-cookie"), /HttpOnly; SameSite=Lax/);
            assert.equal((await response.json()).csrfToken.length, 43);
        },
    );

    const begin = async (returnTo) => {
        const response = await send(
            "/api/auth/login?returnTo=" +
                encodeURIComponent(returnTo || "/profile?tab=files#pending"),
        );
        assert.equal(response.status, 302, await response.clone().text());
        const url = new URL(response.headers.get("location"));
        return {
            url,
            state: url.searchParams.get("state"),
            cookie: response.headers.get("set-cookie").split(";")[0],
        };
    };
    const callback = (flow) => `/api/auth/login/redirect?code=fixture-code&state=${flow.state}`;

    await t.test(
        "OAuth validates browser-bound state and S256 PKCE, preserves destinations and rejects callback replay",
        async (st) => {
            const flow = await begin();
            const other = await begin();
            assert.notEqual(flow.state, other.state);
            assert.equal(flow.url.searchParams.get("code_challenge_method"), "S256");
            let exchanges = 0;
            st.mock.method(axios, "post", async (url, body) => {
                exchanges++;
                const params = new URLSearchParams(body);
                assert.equal(params.get("code"), "fixture-code");
                const verifier = params.get("code_verifier");
                assert.match(verifier, /^[A-Za-z0-9_-]{43,128}$/);
                assert.equal(
                    createHash("sha256").update(verifier).digest("base64url"),
                    flow.url.searchParams.get("code_challenge"),
                );
                return { data: { access_token: "test-graph-access" } };
            });
            st.mock.method(graph, "request", async () => ({
                data: { mail: person.email, surname: String(person.rollNumber) },
            }));
            for (const headers of [{}, { cookie: other.cookie }])
                assert.equal((await send(callback(flow), { headers })).status, 400);
            assert.equal(exchanges, 0);
            const responses = await Promise.all([
                send(callback(flow), { headers: { cookie: flow.cookie } }),
                send(callback(flow), { headers: { cookie: flow.cookie } }),
            ]);
            assert.deepEqual(responses.map((r) => r.status).sort(), [302, 400]);
            assert.equal(exchanges, 1);
            const success = responses.find((r) => r.status === 302);
            assert.equal(
                success.headers.get("location"),
                testOrigin + "/loading?returnTo=%2Fprofile%3Ftab%3Dfiles%23pending",
            );
            assert.ok(
                success.headers
                    .getSetCookie()
                    .some((value) => /token=.*Max-Age=2073600/.test(value)),
            );
            assert.equal(
                (await send(callback(flow), { headers: { cookie: flow.cookie } })).status,
                400,
            );
        },
    );

    await t.test(
        "expired OAuth attempts and unsafe destinations are rejected without provider exchange",
        async () => {
            const flow = await begin("//attacker.example/steal");
            const id = createHash("sha256").update(flow.state).digest("base64url");
            assert.equal((await OAuthAttempt.findById(id)).returnTo, "/dashboard");
            await OAuthAttempt.updateOne({ _id: id }, { $set: { expiresAt: new Date(0) } });
            assert.equal(
                (await send(callback(flow), { headers: { cookie: flow.cookie } })).status,
                400,
            );
        },
    );

    await t.test("OAuth provider failures finish safely and consume the attempt", async (st) => {
        const flow = await begin();
        st.mock.method(axios, "post", async () => {
            throw Object.assign(new Error("provider-secret"), {
                isAxiosError: true,
                response: { status: 500, data: { secret: "provider-secret" } },
            });
        });
        const response = await send(callback(flow), { headers: { cookie: flow.cookie } });
        assert.equal(response.status, 502);
        assert.doesNotMatch(await response.text(), /provider-secret/);
        assert.equal(
            (await send(callback(flow), { headers: { cookie: flow.cookie } })).status,
            400,
        );
    });

    await t.test(
        "authentication throttling persists in MongoDB and reports a retry interval",
        async () => {
            await AuthRateLimit.deleteMany({});
            process.env.AUTH_RATE_LIMIT = "2";
            try {
                for (const status of [401, 401, 429]) {
                    const response = await send("/api/admin/auth/login", {
                        method: "POST",
                        headers: { origin: testOrigin, "content-type": "application/json" },
                        body: JSON.stringify({
                            userId: "unknown-admin",
                            password: "wrong-password",
                        }),
                    });
                    assert.equal(response.status, status);
                    if (status === 429) {
                        assert.ok(Number(response.headers.get("retry-after")) > 0);
                        assert.equal((await response.json()).code, "AUTH_THROTTLED");
                    }
                }
                assert.ok(await AuthRateLimit.countDocuments({ count: { $gte: 3 } }));
            } finally {
                delete process.env.AUTH_RATE_LIMIT;
                await AuthRateLimit.deleteMany({});
            }
        },
    );
}
