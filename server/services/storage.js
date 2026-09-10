import fs from "node:fs/promises";
import { constants } from "node:fs";
import { setTimeout as delay } from "node:timers/promises";
import { graph, StorageError } from "./graphClient.js";
import { storageRoot, graphChunkBytes } from "../config/storage.js";
import AppError from "../utils/appError.js";

export function storageId(id) {
    if (typeof id !== "string" || !/^[a-zA-Z0-9!_.-]{1,300}$/.test(id) || [".", ".."].includes(id))
        throw new AppError(400, "Invalid storage identity", "INVALID_STORAGE_ID");
    return encodeURIComponent(id);
}

export function createStorage({ client = graph, root = storageRoot, sleep = delay } = {}) {
    const itemPath = (id) => `me/drive/items/${storageId(id)}`;
    async function item(id, options) {
        const { data } = await client.request(itemPath(id), options);
        if (!data || data.id !== id) throw new StorageError(502, "INVALID_STORAGE_RESPONSE");
        return data;
    }
    async function withinRoot(id, { allowRoot = false, signal } = {}) {
        if (id === root() && !allowRoot)
            throw new AppError(403, "The storage root is protected", "STORAGE_ROOT_PROTECTED");
        const seen = new Set();
        let current = id;
        let resource;
        while (current && seen.size < 64) {
            if (seen.has(current)) throw new StorageError(502, "INVALID_STORAGE_TOPOLOGY");
            seen.add(current);
            const data = await item(current, { signal });
            resource ||= data;
            if (current === root()) {
                if (!data.folder) throw new StorageError(502, "INVALID_STORAGE_ROOT");
                return resource;
            }
            current = data.parentReference?.id;
        }
        throw new AppError(
            403,
            "The resource is outside CourseHub storage",
            "STORAGE_OUTSIDE_ROOT",
        );
    }
    async function children(id = root(), options = {}) {
        await withinRoot(id, { ...options, allowRoot: true });
        return client.collection(`${itemPath(id)}/children`, options);
    }
    async function remove(id, options = {}) {
        if (id === root())
            throw new AppError(403, "The storage root is protected", "STORAGE_ROOT_PROTECTED");
        try {
            const resource = await withinRoot(id, options);
            if (resource.folder)
                throw new AppError(
                    403,
                    "Automatic storage-folder deletion is not allowed",
                    "STORAGE_FOLDER_PROTECTED",
                );
            await client.request(itemPath(id), { ...options, method: "DELETE" });
        } catch (error) {
            if (error.providerStatus !== 404) throw error;
        }
    }
    async function content(id, options = {}) {
        await withinRoot(id, options);
        const { format, ...requestOptions } = options;
        if (format && format !== "pdf") throw new AppError(400, "Unsupported preview format");
        return client.request(`${itemPath(id)}/content${format ? "?format=pdf" : ""}`, {
            ...requestOptions,
            responseType: "stream",
        });
    }
    async function thumbnail(id, options = {}) {
        await withinRoot(id, options);
        const thumbnails = await client.collection(`${itemPath(id)}/thumbnails`, options);
        return thumbnails.find((entry) => entry.medium?.url)?.medium.url;
    }
    async function findUpload(name, size, options = {}) {
        if (!/^[a-f0-9-]{36}(\.[a-zA-Z0-9]{1,15})?$/.test(name))
            throw new AppError(400, "Invalid upload identity");
        try {
            const { data } = await client.request(
                `${itemPath(root())}:/${encodeURIComponent(name)}`,
                options,
            );
            if (!data?.id || data.folder || data.name !== name || data.size !== size)
                throw new StorageError(409, "STORAGE_UPLOAD_CONFLICT");
            await withinRoot(data.id, options);
            return data;
        } catch (error) {
            if (error.providerStatus === 404) return null;
            throw error;
        }
    }
    async function cancelSession(url, options = {}) {
        if (!url) return;
        try {
            await client.request(url, { ...options, method: "DELETE", preauthenticated: true });
        } catch (error) {
            if (![404, 410].includes(error.providerStatus)) throw error;
        }
    }
    async function upload({
        filename,
        remoteName,
        size,
        sessionUrl,
        signal,
        onSession,
        onProgress,
        checkCancelled = async () => {},
    }) {
        await withinRoot(root(), { allowRoot: true, signal });
        const completed = await findUpload(remoteName, size, { signal });
        if (completed) return completed;
        let session;
        if (sessionUrl) {
            try {
                session = (await client.request(sessionUrl, { preauthenticated: true, signal }))
                    .data;
            } catch (error) {
                if (![404, 410].includes(error.providerStatus)) throw error;
                sessionUrl = undefined;
            }
        }
        if (!sessionUrl) {
            session = (
                await client.request(
                    `${itemPath(root())}:/${encodeURIComponent(remoteName)}:/createUploadSession`,
                    {
                        method: "POST",
                        data: {
                            // Graph's OData reader requires annotations before item properties.
                            item: { "@microsoft.graph.conflictBehavior": "fail", name: remoteName },
                        },
                        signal,
                    },
                )
            ).data;
            if (typeof session?.uploadUrl !== "string")
                throw new StorageError(502, "INVALID_STORAGE_RESPONSE");
            sessionUrl = session.uploadUrl;
            await onSession(sessionUrl);
        }
        let offset = nextOffset(session, size);
        let stalled = 0;
        const handle = await fs.open(filename, constants.O_RDONLY | constants.O_NOFOLLOW);
        try {
            if ((await handle.stat()).size !== size)
                throw new AppError(400, "Upload size changed", "UPLOAD_SIZE_MISMATCH");
            while (offset < size) {
                await checkCancelled();
                signal?.throwIfAborted();
                const length = Math.min(graphChunkBytes, size - offset);
                const buffer = Buffer.allocUnsafe(length);
                const { bytesRead } = await handle.read(buffer, 0, length, offset);
                if (bytesRead !== length)
                    throw new AppError(400, "Upload size changed", "UPLOAD_SIZE_MISMATCH");
                let result;
                try {
                    result = await client.request(sessionUrl, {
                        method: "PUT",
                        preauthenticated: true,
                        signal,
                        retries: 0,
                        data: buffer,
                        maxBodyLength: graphChunkBytes,
                        headers: {
                            "Content-Length": String(length),
                            "Content-Range": `bytes ${offset}-${offset + length - 1}/${size}`,
                        },
                    });
                } catch (error) {
                    if (
                        ![416, 429, 500, 502, 503, 504].includes(error.providerStatus) ||
                        stalled++ >= 2
                    )
                        throw error;
                    if (error.retryAfterMs > 30000) throw error;
                    await sleep(error.retryAfterMs || 250, undefined, { signal });
                    // A lost response may already have committed the chunk/file.
                    const finished = await findUpload(remoteName, size, { signal });
                    if (finished) return finished;
                    result = await client.request(sessionUrl, { preauthenticated: true, signal });
                }
                if ([200, 201].includes(result.status) && result.data?.id) {
                    if (
                        result.data.size !== size ||
                        result.data.folder ||
                        result.data.name !== remoteName
                    )
                        throw new StorageError(502, "INVALID_STORAGE_RESPONSE");
                    await withinRoot(result.data.id, { signal });
                    await onProgress(size);
                    return result.data;
                }
                const next = nextOffset(result.data, size);
                if (next <= offset && stalled++ >= 2)
                    throw new StorageError(502, "STORAGE_UPLOAD_STALLED");
                if (next > offset) stalled = 0;
                offset = next;
                await onProgress(offset);
            }
            throw new StorageError(502, "INVALID_STORAGE_RESPONSE");
        } finally {
            await handle.close();
        }
    }
    return {
        item,
        withinRoot,
        children,
        remove,
        content,
        thumbnail,
        upload,
        findUpload,
        cancelSession,
    };
}

function nextOffset(data, size) {
    const ranges = data?.nextExpectedRanges;
    if (!Array.isArray(ranges) || !ranges.length)
        throw new StorageError(502, "INVALID_STORAGE_RESPONSE");
    const offsets = ranges.map((range) => {
        const match = typeof range === "string" && range.match(/^(\d+)-(\d*)$/);
        const start = match ? Number(match[1]) : NaN;
        if (
            !Number.isSafeInteger(start) ||
            start < 0 ||
            start >= size ||
            start % (320 * 1024) !== 0 ||
            (match[2] &&
                (!Number.isSafeInteger(Number(match[2])) ||
                    Number(match[2]) < start ||
                    Number(match[2]) >= size))
        )
            throw new StorageError(502, "INVALID_STORAGE_RESPONSE");
        return start;
    });
    return Math.min(...offsets);
}

export const storage = createStorage();
