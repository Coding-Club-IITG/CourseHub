import { storage } from "./storage.js";
import { graph } from "./graphClient.js";
import { isImageKitUrl } from "./imagekit.js";
import AppError from "../utils/appError.js";

const cache = new Map();
export async function thumbnailUrl(id, { refresh = false, signal } = {}) {
    if (refresh) cache.delete(id);
    let record = cache.get(id);
    if (!record || record.expires <= Date.now()) {
        if (cache.size >= 200) cache.delete(cache.keys().next().value);
        record = { expires: Date.now() + 60000, promise: storage.thumbnail(id, { signal }) };
        cache.set(id, record);
        record.promise.catch(() => {
            if (cache.get(id) === record) cache.delete(id);
        });
    }
    return record.promise;
}
export async function thumbnailStream(file, { signal } = {}) {
    await storage.withinRoot(file.fileId, { signal });
    const cached = typeof file.thumbnail === "string" ? file.thumbnail : file.thumbnail?.url;
    let url = isImageKitUrl(cached) ? cached : await thumbnailUrl(file.fileId, { signal });
    for (let attempt = 0; attempt < 2; attempt++) {
        if (!url) throw new AppError(404, "Thumbnail not found");
        try {
            return await graph.request(url, {
                preauthenticated: true,
                trustedOrigin: process.env.IMAGEKIT_URL_ENDPOINT,
                responseType: "stream",
                signal,
            });
        } catch (error) {
            if (attempt || ![401, 403, 404].includes(error.providerStatus)) throw error;
            url = await thumbnailUrl(file.fileId, { refresh: true, signal });
        }
    }
}
export function invalidateThumbnail(id) {
    cache.delete(id);
}
