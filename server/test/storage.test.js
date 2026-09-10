import "./support/environment.js";
import assert from "node:assert/strict";
import { test } from "node:test";
import fs from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { createTokenStore, atomicPrivateWrite } from "../services/tokenStore.js";
import { createGraphClient, StorageError } from "../services/graphClient.js";
import { createStorage } from "../services/storage.js";
import { graphChunkBytes } from "../config/storage.js";
import { storage } from "../services/storage.js";
import { graph } from "../services/graphClient.js";
import { thumbnailStream, invalidateThumbnail } from "../services/thumbnails.js";

async function directory(t) {
    const dir = await fs.mkdtemp(path.join(tmpdir(), "coursehub-storage-"));
    t.after(() => fs.rm(dir, { recursive: true, force: true }));
    return dir;
}
const response = (data, status = 200, headers = {}) => ({ data, status, headers });
const failure = (status, headers = {}) =>
    Object.assign(new Error("private provider response"), {
        response: { status, headers, data: { secret: "provider-secret" } },
    });

test("Graph timeouts and malformed responses are bounded and discard provider details", async () => {
    let attempts = 0;
    const client = createGraphClient({
        tokens: { getAccessToken: async () => "private-token" },
        sleep: async () => {},
        transport: async (config) => {
            assert.equal(config.timeout, 30000);
            attempts++;
            throw Object.assign(new Error("private provider payload"), {
                code: "ECONNABORTED",
                config,
            });
        },
    });
    await assert.rejects(
        client.request("me/drive"),
        (error) => error.status === 504 && !JSON.stringify(error).includes("private"),
    );
    assert.equal(attempts, 3);
    const malformed = createGraphClient({
        tokens: { getAccessToken: async () => "token" },
        transport: async () => ({ data: {} }),
    });
    await assert.rejects(malformed.request("me"), { code: "INVALID_STORAGE_RESPONSE" });
});

test("thumbnail delivery rechecks root membership, refreshes expired URLs and rejects lookalike ImageKit paths", async (t) => {
    const id = "thumbnail-test";
    t.after(() => invalidateThumbnail(id));
    let lookups = 0,
        deliveries = 0,
        roots = 0;
    t.mock.method(storage, "withinRoot", async () => {
        roots++;
    });
    t.mock.method(
        storage,
        "thumbnail",
        async () => `https://tenant.sharepoint.com/thumb-${++lookups}`,
    );
    t.mock.method(graph, "request", async (url, options) => {
        assert.equal(options.preauthenticated, true);
        deliveries++;
        assert.ok(url.startsWith("https://tenant.sharepoint.com/"));
        if (deliveries === 1) throw new StorageError(403);
        return { data: "thumbnail", headers: { "content-type": "image/webp" } };
    });
    const file = {
        fileId: id,
        thumbnail: { url: "https://ik.imagekit.io/coursehub-test-attacker/image.webp" },
    };
    assert.equal((await thumbnailStream(file)).data, "thumbnail");
    await Promise.all([thumbnailStream(file), thumbnailStream(file)]);
    assert.equal(lookups, 2);
    assert.equal(deliveries, 4);
    assert.equal(roots, 3);
    t.mock.method(storage, "withinRoot", async () => {
        throw new StorageError(404);
    });
    await assert.rejects(thumbnailStream(file), StorageError);
    assert.equal(deliveries, 4);
});

test("concurrent token stores share one refresh and atomically preserve rotating credentials", async (t) => {
    const dir = await directory(t);
    await atomicPrivateWrite(path.join(dir, "onedrive-refresh-token.token"), "old-refresh");
    let requests = 0;
    const request = async (body, options) => {
        requests++;
        assert.equal(
            new URLSearchParams(body).get("refresh_token"),
            requests === 1 ? "old-refresh" : "new-refresh",
        );
        assert.equal(options.timeout, 30000);
        return response({
            access_token: "access-" + requests,
            refresh_token: "new-refresh",
            expires_in: 3600,
        });
    };
    const stores = [
        createTokenStore({ directory: () => dir, request }),
        createTokenStore({ directory: () => dir, request }),
    ];
    const tokens = await Promise.all(
        Array.from({ length: 12 }, (_, i) => stores[i % 2].getAccessToken()),
    );
    assert.deepEqual(new Set(tokens), new Set(["access-1"]));
    assert.equal(requests, 1);
    assert.equal(await stores[0].getAccessToken({ rejected: "access-1" }), "access-2");
    for (const filename of ["onedrive-refresh-token.token", "onedrive-access-token.json"]) {
        assert.equal((await fs.stat(path.join(dir, filename))).mode & 0o777, 0o600);
    }
    assert.equal(
        await fs.readFile(path.join(dir, "onedrive-refresh-token.token"), "utf8"),
        "new-refresh",
    );
    assert.ok(
        (await fs.readdir(dir)).every((name) => !name.endsWith(".tmp") && !name.endsWith(".lock")),
    );
});

test("failed or malformed token refresh preserves the last stored credential and exposes no provider details", async (t) => {
    const dir = await directory(t);
    const filename = path.join(dir, "onedrive-refresh-token.token");
    await atomicPrivateWrite(filename, "preserve-this-refresh");
    for (const request of [
        async () => {
            throw failure(500);
        },
        async () => response({ access_token: "bad", expires_in: "invalid" }),
    ]) {
        const store = createTokenStore({ directory: () => dir, request });
        await assert.rejects(
            store.getAccessToken(),
            (error) => !JSON.stringify(error).includes("provider-secret"),
        );
        assert.equal(await fs.readFile(filename, "utf8"), "preserve-this-refresh");
        assert.ok(!(await fs.readdir(dir)).some((name) => name.endsWith(".lock")));
    }
});

test("Graph follows every nextLink and rejects cycles, foreign origins and malformed collections", async () => {
    const calls = [];
    const client = createGraphClient({
        tokens: { getAccessToken: async () => "synthetic" },
        transport: async (config) => {
            calls.push(config.url);
            return response(
                config.url.includes("skiptoken")
                    ? { value: [2] }
                    : {
                          value: [1],
                          "@odata.nextLink":
                              "https://graph.microsoft.com/v1.0/me/drive/items/root/children?$skiptoken=opaque%2Btoken",
                      },
            );
        },
    });
    assert.deepEqual(await client.collection("me/drive/items/root/children"), [1, 2]);
    assert.ok(calls[1].endsWith("opaque%2Btoken"));
    for (const data of [
        { value: [], "@odata.nextLink": "https://untrusted.test/steal" },
        { value: [], "@odata.nextLink": "https://graph.microsoft.com/v1.0/me" },
        { invalid: [] },
    ]) {
        let requests = 0;
        const invalid = createGraphClient({
            tokens: { getAccessToken: async () => "token" },
            transport: async () => {
                requests++;
                return response(data);
            },
        });
        await assert.rejects(invalid.collection("me"), StorageError);
        assert.equal(requests, 1);
    }
});

test("Graph refreshes storage authentication once, respects throttling and bounds repeated failures", async () => {
    const refreshes = [],
        waits = [],
        headers = [];
    let calls = 0;
    const client = createGraphClient({
        tokens: {
            getAccessToken: async (options) => {
                refreshes.push(options);
                return options?.rejected ? "new" : "old";
            },
        },
        sleep: async (ms) => waits.push(ms),
        transport: async (config) => {
            calls++;
            headers.push(config.headers.Authorization);
            if (calls === 1) throw failure(401);
            if (calls === 2) throw failure(429, { "retry-after": "2" });
            return response({ id: "ok" });
        },
    });
    assert.deepEqual((await client.request("me")).data, { id: "ok" });
    assert.equal(refreshes.length, 2);
    assert.equal(refreshes[1].rejected, "old");
    assert.deepEqual(headers, ["Bearer old", "Bearer new", "Bearer new"]);
    assert.deepEqual(waits, [2000]);
    calls = 0;
    const down = createGraphClient({
        tokens: { getAccessToken: async () => "token" },
        sleep: async () => {},
        transport: async () => {
            calls++;
            throw failure(503);
        },
    });
    await assert.rejects(
        down.request("me"),
        (error) => error.providerStatus === 503 && !error.message.includes("private"),
    );
    assert.equal(calls, 3);
    const delegated = createGraphClient({
        tokens: {
            getAccessToken: () =>
                assert.fail("A student token must not fall back to storage credentials"),
        },
        transport: async () => {
            throw failure(401);
        },
    });
    await assert.rejects(
        delegated.request("me", { token: "student-token" }),
        (error) => error.providerStatus === 401,
    );
});

test("content redirects are restricted and do not forward Graph bearer credentials", async () => {
    const calls = [];
    const client = createGraphClient({
        tokens: { getAccessToken: async () => "secret-token" },
        transport: async (config) => {
            calls.push(config);
            if (calls.length === 1)
                throw failure(302, {
                    location: "https://tenant.sharepoint.com/content?capability=synthetic",
                });
            return response("content");
        },
    });
    await client.request("me/drive/items/file/content");
    assert.equal(calls[0].headers.Authorization, "Bearer secret-token");
    assert.equal(calls[1].headers.Authorization, undefined);
    await assert.rejects(
        client.request("https://127.0.0.1/private", { preauthenticated: true }),
        StorageError,
    );
    await assert.rejects(client.request("https://graph.microsoft.com@evil.test/me"), StorageError);
});

test("Microsoft media thumbnail redirects work without forwarding credentials or accepting lookalike hosts", async () => {
    const calls = [];
    const client = createGraphClient({
        tokens: { getAccessToken: async () => "secret-token" },
        transport: async (config) => {
            calls.push(config);
            if (calls.length === 1)
                throw failure(302, { location: "https://centralindia1-mediap.svc.ms/thumbnail" });
            return response("thumbnail");
        },
    });
    await client.request("me/drive/items/file/thumbnails/0/medium/content");
    assert.equal(calls[0].headers.Authorization, "Bearer secret-token");
    assert.equal(calls[1].headers.Authorization, undefined);
    for (const url of [
        "https://centralindia1-mediap.svc.ms.evil.test/thumbnail",
        "https://evil-centralindia1-mediap.svc.ms@evil.test/thumbnail",
        "https://centralindia1-mediap.svc.ms:8443/thumbnail",
        "http://centralindia1-mediap.svc.ms/thumbnail",
        "https://unrelated.svc.ms/thumbnail",
    ])
        await assert.rejects(client.request(url, { preauthenticated: true }), StorageError);
    assert.equal(calls.length, 2);
});

test("root-bound resolution forbids automatic folder/root deletion and foreign items; absent files are idempotent", async () => {
    const items = {
        root: { id: "root", folder: {} },
        folder: { id: "folder", folder: {}, parentReference: { id: "root" } },
        file: { id: "file", file: {}, parentReference: { id: "folder" } },
        foreign: { id: "foreign", parentReference: { id: "outside" } },
        outside: { id: "outside", folder: {} },
    };
    const deleted = [];
    const client = {
        request: async (url, options = {}) => {
            const id = url.split("/").at(-1);
            if (!items[id]) throw new StorageError(404);
            if (options.method === "DELETE") {
                deleted.push(id);
                delete items[id];
                return response(null, 204);
            }
            return response(items[id]);
        },
    };
    const store = createStorage({ client, root: () => "root" });
    for (const id of ["root", "folder", "foreign"]) await assert.rejects(store.remove(id));
    assert.deepEqual(deleted, []);
    await store.remove("file");
    await store.remove("file");
    assert.deepEqual(deleted, ["file"]);
});

test("storage sends sequential Graph-compliant chunks and recovers a lost final response without a duplicate file", async (t) => {
    const dir = await directory(t);
    const filename = path.join(dir, "synthetic.upload");
    const size = graphChunkBytes * 2 + 11;
    const handle = await fs.open(filename, "w");
    await handle.truncate(size);
    await handle.close();
    const remoteName = "12345678-1234-1234-1234-123456789abc.pdf";
    const item = {
        id: "uploaded",
        name: remoteName,
        size,
        file: {},
        parentReference: { id: "root" },
    };
    const chunks = [];
    let committed = false,
        persistedSession = false;
    const client = {
        request: async (url, options = {}) => {
            if (url === "me/drive/items/root") return response({ id: "root", folder: {} });
            if (url === "me/drive/items/uploaded") return response(item);
            if (url.endsWith("createUploadSession")) {
                // Preserve wire order: Graph rejects the annotation after the name.
                assert.equal(
                    JSON.stringify(options.data),
                    `{"item":{"@microsoft.graph.conflictBehavior":"fail","name":"${remoteName}"}}`,
                );
                return response({
                    uploadUrl: "https://tenant.sharepoint.com/upload",
                    nextExpectedRanges: ["0-"],
                });
            }
            if (url.startsWith("me/drive/items/root:/")) {
                if (!committed) throw new StorageError(404);
                return response(item);
            }
            assert.equal(options.method, "PUT");
            assert.equal(
                persistedSession,
                true,
                "Session identity must be journaled before sending bytes",
            );
            assert.equal(options.preauthenticated, true);
            assert.equal(options.headers.Authorization, undefined);
            chunks.push({ range: options.headers["Content-Range"], bytes: options.data.length });
            if (chunks.length === 3) {
                committed = true;
                throw new StorageError(503);
            }
            return response({ nextExpectedRanges: [`${chunks.length * graphChunkBytes}-`] }, 202);
        },
    };
    const store = createStorage({ client, root: () => "root" });
    const args = {
        filename,
        remoteName,
        size,
        onSession: async () => {
            persistedSession = true;
        },
        onProgress: async () => {},
    };
    assert.equal((await store.upload(args)).id, "uploaded");
    assert.deepEqual(
        chunks.map((chunk) => chunk.bytes),
        [graphChunkBytes, graphChunkBytes, 11],
    );
    assert.equal(chunks[0].range, `bytes 0-${graphChunkBytes - 1}/${size}`);
    assert.equal(chunks[2].range, `bytes ${graphChunkBytes * 2}-${size - 1}/${size}`);
    assert.equal((await store.upload(args)).id, "uploaded");
    assert.equal(chunks.length, 3);
});
