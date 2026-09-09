import { test } from "node:test";
import assert from "node:assert/strict";
import { createSession } from "../src/session.js";
import { createLibraryCache } from "../src/library.js";
import { createTransport } from "../src/transport.js";

function fixture(t) {
    const transport = createTransport({
        baseUrl: "https://api.example.test/api/",
        role: "student",
        fetchImpl: async () => new Response("{}"),
    });
    const session = createSession({ transport, role: "student", path: "user" });
    session.setActor({ _id: "student-1", capabilities: { canManageCourses: ["CS101"] } });
    const library = createLibraryCache(session, transport, "student");
    t.after(() => {
        library.dispose();
        session.queryClient.clear();
    });
    return { session, library, client: session.queryClient };
}
test("a shared-course mutation invalidates every referencing course and lists, preserving unrelated caches", async (t) => {
    const { library, client } = fixture(t);
    const a = library.key("course", "cs 101"),
        b = library.key("course", "MA101"),
        c = library.key("course", "PH101"),
        list = library.key("courses");
    client.setQueryData(a, { code: "CS101", children: [{ affectedCourses: ["CS101", "MA101"] }] });
    client.setQueryData(b, { code: "MA101", children: [{ affectedCourses: ["CS101", "MA101"] }] });
    client.setQueryData(c, { code: "PH101", children: [] });
    client.setQueryData(list, []);
    await library.invalidate(["cs101"]);
    for (const key of [a, b, list]) assert.equal(client.getQueryState(key).isInvalidated, true);
    assert.equal(client.getQueryState(c).isInvalidated, false);
});
test("actor changes, BR revocation and logout remove previous resource data", (t) => {
    const { library, session, client } = fixture(t);
    const first = library.key("course", "CS101");
    client.setQueryData(first, { private: true });
    session.setActor({ _id: "student-1", capabilities: { canManageCourses: [] } });
    const revoked = library.key("course", "CS101");
    assert.notDeepEqual(first, revoked);
    assert.equal(client.getQueryData(first), undefined);
    client.setQueryData(revoked, { visible: true });
    session.setActor({ _id: "student-2" });
    assert.equal(client.getQueryData(revoked), undefined);
    const second = library.key("course", "CS101");
    client.setQueryData(second, { visible: true });
    session.clear();
    assert.equal(client.getQueryData(second), undefined);
    assert.equal(client.getQueryData(session.options.queryKey), null);
});
test("unchanged server revisions preserve references and a newer empty tree replaces populated data", (t) => {
    const { library } = fixture(t);
    const options = library.options("course", "CS101", () => {});
    const old = { revision: "one", children: [{ _id: "year" }] };
    assert.equal(options.structuralSharing(old, structuredClone(old)), old);
    const empty = options.structuralSharing(old, { revision: "two", children: [] });
    assert.deepEqual(empty.children, []);
    assert.notEqual(empty, old);
});
test("completing or partially completing an operation refreshes affected data once per operation state", (t) => {
    const { library, client } = fixture(t);
    const key = library.key("course", "CS101");
    client.setQueryData(key, { children: [] });
    const operation = {
        id: "op",
        status: "partial",
        affectedCourses: ["CS101"],
        entries: [{ id: "file", state: "completed" }],
    };
    library.observeOperation(operation);
    assert.equal(client.getQueryState(key).isInvalidated, true);
    client.setQueryData(key, { children: [{ _id: "file" }] });
    library.observeOperation(operation);
    assert.equal(client.getQueryState(key).isInvalidated, false);
    library.observeOperation({ ...operation, status: "completed" });
    assert.equal(client.getQueryState(key).isInvalidated, true);
});
