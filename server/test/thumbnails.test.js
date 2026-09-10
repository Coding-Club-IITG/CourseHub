import "./support/environment.js";
import assert from "node:assert/strict";
import { test } from "node:test";
import { Readable } from "node:stream";
import { thumbnailStream, invalidateThumbnail } from "../services/thumbnails.js";
import { storage } from "../services/storage.js";
import { graph, createGraphClient } from "../services/graphClient.js";

for (const endpoint of [
    undefined,
    "<your_imagekit_url_endpoint>",
    "https://ik.imagekit.io/coursehub-test/",
]) {
    test(`Graph thumbnails work with ImageKit ${endpoint === undefined ? "absent" : endpoint.startsWith("<") ? "a placeholder" : "configured"}`, async (t) => {
        const previous = process.env.IMAGEKIT_URL_ENDPOINT;
        if (endpoint === undefined) delete process.env.IMAGEKIT_URL_ENDPOINT;
        else process.env.IMAGEKIT_URL_ENDPOINT = endpoint;
        t.after(() => {
            process.env.IMAGEKIT_URL_ENDPOINT = previous;
            invalidateThumbnail("thumbnail-fixture");
        });
        const withinRoot = t.mock.method(storage, "withinRoot", async () => {});
        const url = "https://centralindia1-mediap.svc.ms/thumbnail";
        t.mock.method(storage, "thumbnail", async () => url);
        const calls = [];
        const client = createGraphClient({
            transport: async (config) => {
                calls.push(config);
                return {
                    status: 200,
                    headers: { "content-type": "image/jpeg" },
                    data: Readable.from(["thumbnail fixture"]),
                };
            },
        });
        t.mock.method(graph, "request", client.request);
        const response = await thumbnailStream({ fileId: "thumbnail-fixture" });
        assert.equal(response.status, 200);
        assert.equal(
            await response.data.toArray().then((chunks) => chunks.join("")),
            "thumbnail fixture",
        );
        assert.equal(withinRoot.mock.callCount(), 1);
        assert.equal(calls[0].url, url);
        assert.equal(calls[0].headers.Authorization, undefined);
    });
}

test("configured ImageKit thumbnails retain authorized delivery and expired links fall back to Graph", async (t) => {
    const url = "https://ik.imagekit.io/coursehub-test/old-thumbnail.jpg";
    t.mock.method(storage, "withinRoot", async () => {});
    t.mock.method(
        storage,
        "thumbnail",
        async () => "https://tenant.sharepoint.com/fresh-thumbnail",
    );
    const calls = [];
    const client = createGraphClient({
        transport: async (config) => {
            calls.push(config);
            if (config.url === url) throw { response: { status: 404 } };
            return {
                status: 200,
                headers: { "content-type": "image/jpeg" },
                data: Readable.from(["fresh thumbnail"]),
            };
        },
    });
    t.mock.method(graph, "request", client.request);
    t.after(() => invalidateThumbnail("expired-thumbnail-fixture"));
    const response = await thumbnailStream({
        fileId: "expired-thumbnail-fixture",
        thumbnail: { url },
    });
    assert.equal(response.status, 200);
    response.data.destroy();
    assert.deepEqual(
        calls.map((call) => call.url),
        [url, "https://tenant.sharepoint.com/fresh-thumbnail"],
    );
    assert.ok(calls.every((call) => !call.headers.Authorization));
});

test("thumbnail delivery stops before provider access when a file is outside the configured root", async (t) => {
    t.mock.method(storage, "withinRoot", async () => {
        throw new Error("Outside root");
    });
    const request = t.mock.method(graph, "request", async () => {
        throw new Error("Must not run");
    });
    await assert.rejects(thumbnailStream({ fileId: "outside-root" }), /Outside root/);
    assert.equal(request.mock.callCount(), 0);
});
