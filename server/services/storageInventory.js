import { createHash } from "node:crypto";

function linkSummary(value) {
    if (!value) return undefined;
    try {
        const url = new URL(value);
        return {
            host: url.hostname,
            protocol: url.protocol,
            fingerprint: createHash("sha256").update(String(value)).digest("hex"),
        };
    } catch {
        return { malformed: true };
    }
}

export async function inventoryStorage(files, root) {
    const records = [];
    const counts = {
        files: 0,
        storedWebLinks: 0,
        storedDownloadLinks: 0,
        thumbnailReferences: 0,
        rootReferences: 0,
        invalidProviderIds: 0,
    };
    for await (const file of files) {
        counts.files++;
        const webLink = linkSummary(file.webUrl),
            downloadLink = linkSummary(file.downloadUrl);
        const thumbnail = linkSummary(
            typeof file.thumbnail === "string" ? file.thumbnail : file.thumbnail?.url,
        );
        if (webLink) counts.storedWebLinks++;
        if (downloadLink) counts.storedDownloadLinks++;
        if (thumbnail || file.thumbnail?.fileId) counts.thumbnailReferences++;
        const protectedRoot = file.fileId === root;
        const invalidProviderId =
            typeof file.fileId !== "string" ||
            !/^[a-zA-Z0-9!_.-]{1,300}$/.test(file.fileId) ||
            [".", ".."].includes(file.fileId);
        if (protectedRoot) counts.rootReferences++;
        if (invalidProviderId) counts.invalidProviderIds++;
        records.push({
            resourceId: String(file._id),
            providerId: invalidProviderId ? undefined : file.fileId,
            webLink,
            downloadLink,
            thumbnail,
            thumbnailId:
                typeof file.thumbnail?.fileId === "string" &&
                /^[a-zA-Z0-9_-]{1,300}$/.test(file.thumbnail.fileId)
                    ? file.thumbnail.fileId
                    : undefined,
            protectedRoot,
            invalidProviderId,
        });
    }
    return {
        version: 1,
        generatedAt: new Date().toISOString(),
        mode: "read-only",
        counts,
        records,
        providerPermissionsVerified: false,
        nextStep:
            "Review existing sharing permissions and root membership in an explicitly selected provider test area. Stored links do not prove current public access, and absence does not prove private access. No permissions were changed.",
    };
}
