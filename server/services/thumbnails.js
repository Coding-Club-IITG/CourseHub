import { storage } from "./storage.js";
import { graph } from "./graphClient.js";
import { isImageKitUrl } from "./imagekit.js";
import AppError from "../utils/appError.js";

const cache = new Map();
export async function thumbnailUrl(id, { refresh = false, signal } = {}) {
    return cachedThumbnailUrl(id, { refresh, signal }, (options) => storage.thumbnail(id, options));
}
async function cachedThumbnailUrl(id, { refresh = false, signal } = {}, load) {
    signal?.throwIfAborted();
    if (refresh) cache.delete(id);
    let record = cache.get(id);
    if (!record || record.expires <= Date.now()) {
        if (cache.size >= 200) cache.delete(cache.keys().next().value);
        record = {
            expires: Date.now() + 60000,
            promise: load({ signal: AbortSignal.timeout(30_000) }),
        };
        cache.set(id, record);
        record.promise.catch(() => {
            if (cache.get(id) === record) cache.delete(id);
        });
    }
    if (!signal) return record.promise;
    return new Promise((resolve, reject) => {
        const abort = () => reject(signal.reason);
        signal.addEventListener("abort", abort, { once: true });
        record.promise
            .then((url) => {
                signal.throwIfAborted();
                resolve(url);
            }, reject)
            .catch(reject)
            .finally(() => signal.removeEventListener("abort", abort));
    });
}
export async function thumbnailStream(file, { signal } = {}) {
    const load = await storage.thumbnailSource(file.fileId, { signal });
    const cached = typeof file.thumbnail === "string" ? file.thumbnail : file.thumbnail?.url;
    let url = isImageKitUrl(cached)
        ? cached
        : await cachedThumbnailUrl(file.fileId, { signal }, load);
    for (let attempt = 0; attempt < 2; attempt++) {
        if (!url) throw new AppError(404, "Thumbnail not found");
        try {
            return await graph.request(url, {
                preauthenticated: true,
                ...(isImageKitUrl(url) ? { trustedOrigin: process.env.IMAGEKIT_URL_ENDPOINT } : {}),
                responseType: "stream",
                signal,
            });
        } catch (error) {
            if (attempt || ![401, 403, 404].includes(error.providerStatus)) throw error;
            url = await cachedThumbnailUrl(file.fileId, { refresh: true, signal }, load);
        }
    }
}
export function invalidateThumbnail(id) {
    cache.delete(id);
}
