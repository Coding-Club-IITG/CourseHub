import ImageKit, { toFile } from "@imagekit/nodejs";

// Lazy singleton — deferred until first use so env vars are loaded
let _ik = null;
function getClient() {
    if (!_ik) {
        if (!process.env.IMAGEKIT_PUBLIC_KEY || !process.env.IMAGEKIT_PRIVATE_KEY || !process.env.IMAGEKIT_URL_ENDPOINT) {
            throw new Error("IMAGEKIT_PUBLIC_KEY, IMAGEKIT_PRIVATE_KEY and IMAGEKIT_URL_ENDPOINT must be set in .env");
        }
        _ik = new ImageKit({
            publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
            privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
            urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
        });
    }
    return _ik;
}

/**
 * Upload a raw image buffer to ImageKit as WebP and return the permanent URL.
 * Uses fileId as the filename so re-uploads overwrite the existing file.
 * ImageKit handles WebP conversion at the CDN edge — no sharp needed.
 */
export async function uploadThumbnail(fileId, imageBuffer) {
    const fileObject = await toFile(imageBuffer, `${fileId}.webp`, { type: "image/webp" });
    const response = await getClient().files.upload({
        file: fileObject,
        fileName: `${fileId}.webp`,
        folder: "/thumbnails",
        useUniqueFileName: false,       // overwrite same fileId on re-upload
        transformation: {
            pre: "f-webp,q-80",         // convert to WebP quality 80 at edge
        },
    });
    return { url: response.url, fileId: response.fileId };
}

/**
 * Delete a thumbnail from ImageKit by its internal fileId.
 */
export async function deleteThumbnail(imagekitFileId) {
    await getClient().files.delete(imagekitFileId);
}

/**
 * Returns true if the URL is already a permanent ImageKit URL.
 */
export function isImageKitUrl(url) {
    return Boolean(url && process.env.IMAGEKIT_URL_ENDPOINT && url.startsWith(process.env.IMAGEKIT_URL_ENDPOINT));
}

export default getClient;
