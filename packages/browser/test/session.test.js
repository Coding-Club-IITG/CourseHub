import { test } from "node:test";
import assert from "node:assert/strict";
import { createTransport } from "../src/transport.js";
import { createSession } from "../src/session.js";

test("an expired bootstrap finishes as signed out and cannot be restored by a late profile update", async (t) => {
    const transport = createTransport({
        baseUrl: "https://api.example.test/api/",
        role: "student",
        fetchImpl: async () => new Response("{}", { status: 401 }),
    });
    const session = createSession({ transport, role: "student", path: "user" });
    t.after(() => session.queryClient.clear());
    session.setActor({ _id: "previous-user" });
    assert.equal(await session.refresh(), null);
    session.setActor((current) => ({ ...current, name: "A late save" }));
    assert.equal(session.queryClient.getQueryData(session.options.queryKey), null);
});

for (const role of ["student", "admin"]) {
    test(`${role} bootstrap with only the other role signed in clears its own cache and permits a new login`, async (t) => {
        let signedIn = false,
            release;
        const late = new Promise((resolve) => {
            release = resolve;
        });
        const transport = createTransport({
            baseUrl: "https://api.example.test/api/",
            role,
            fetchImpl: async (url) => {
                if (url.endsWith("/late")) {
                    await late;
                    return new Response("{}");
                }
                return new Response(
                    JSON.stringify(signedIn ? { _id: role + "-new", csrfToken: "new-token" } : {}),
                    { status: signedIn ? 200 : 403 },
                );
            },
        });
        const session = createSession({ transport, role, path: "bootstrap" });
        t.after(() => session.queryClient.clear());
        session.setActor({ _id: role + "-old" });
        session.queryClient.setQueryData(["library", role], ["private cached data"]);
        const pending = transport.json("late");
        const stopped = assert.rejects(pending, { name: "AbortError" });
        assert.equal(await session.refresh(), null);
        assert.equal(session.queryClient.getQueryData(["library", role]), undefined);
        assert.equal(session.queryClient.getQueryState(session.options.queryKey).status, "success");
        release();
        await stopped;
        session.setActor((current) => ({ ...current, name: "Late edit" }));
        assert.equal(session.queryClient.getQueryData(session.options.queryKey), null);
        signedIn = true;
        assert.equal((await session.refresh())._id, role + "-new");
    });
}

test("role-specific bootstraps remain independent, resource 403s retain sessions, and outages remain retryable", async (t) => {
    let adminStatus = 403;
    const sessions = Object.fromEntries(
        ["student", "admin"].map((role) => {
            const transport = createTransport({
                baseUrl: "https://api.example.test/api/",
                role,
                fetchImpl: async (url) =>
                    new Response(JSON.stringify({ _id: role }), {
                        status: url.endsWith("/resource")
                            ? 403
                            : role === "admin"
                              ? adminStatus
                              : 200,
                    }),
            });
            return [
                role,
                { transport, session: createSession({ transport, role, path: "bootstrap" }) },
            ];
        }),
    );
    t.after(() => Object.values(sessions).forEach(({ session }) => session.queryClient.clear()));
    const { student, admin } = sessions;
    assert.equal((await student.session.refresh())._id, "student");
    assert.equal(await admin.session.refresh(), null);
    assert.equal(
        student.session.queryClient.getQueryData(student.session.options.queryKey)._id,
        "student",
    );
    adminStatus = 200;
    assert.equal((await admin.session.refresh())._id, "admin");
    await assert.rejects(admin.transport.json("resource"), { status: 403 });
    assert.equal(
        admin.session.queryClient.getQueryData(admin.session.options.queryKey)._id,
        "admin",
    );
    adminStatus = 503;
    await assert.rejects(admin.session.refresh(), { status: 503 });
    assert.equal(
        admin.session.queryClient.getQueryState(admin.session.options.queryKey).status,
        "error",
    );
    assert.equal(
        student.session.queryClient.getQueryData(student.session.options.queryKey)._id,
        "student",
    );
    adminStatus = 200;
    assert.equal((await admin.session.refresh())._id, "admin");
});
