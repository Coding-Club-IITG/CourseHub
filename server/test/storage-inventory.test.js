import assert from "node:assert/strict";
import { test } from "node:test";
import { inventoryStorage } from "../services/storageInventory.js";

test("storage inventory identifies stored sharing and protected roots without exposing bearer URLs or claiming provider verification", async () => {
    const report = await inventoryStorage(
        [
            {
                _id: "file-one",
                fileId: "root",
                webUrl: "https://tenant.sharepoint.com/file?token=private-sharing-key",
                downloadUrl: "https://files.1drv.com/download?secret=private-download-key",
                thumbnail: {
                    fileId: "thumbnail-id",
                    url: "https://ik.imagekit.io/coursehub/thumb.webp",
                },
            },
            { _id: "file-two", fileId: "../foreign", webUrl: "malformed" },
            { _id: "file-three", fileId: "plain-file" },
        ],
        "root",
    );
    assert.deepEqual(report.counts, {
        files: 3,
        storedWebLinks: 2,
        storedDownloadLinks: 1,
        thumbnailReferences: 1,
        rootReferences: 1,
        invalidProviderIds: 1,
    });
    assert.equal(report.providerPermissionsVerified, false);
    assert.equal(report.records[1].webLink.malformed, true);
    assert.equal(report.records[0].webLink.host, "tenant.sharepoint.com");
    assert.doesNotMatch(JSON.stringify(report), /private-sharing-key|private-download-key|token=/);
});
