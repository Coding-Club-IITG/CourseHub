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
