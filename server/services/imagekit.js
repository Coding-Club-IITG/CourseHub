import ImageKit from "@imagekit/nodejs";

// Lazy singleton - deferred until first use so env vars are loaded
let _ik = null;
function getClient() {
    if (!_ik) {
        if (
            !process.env.IMAGEKIT_PUBLIC_KEY ||
            !process.env.IMAGEKIT_PRIVATE_KEY ||
            !process.env.IMAGEKIT_URL_ENDPOINT
        ) {
            throw new Error(
                "IMAGEKIT_PUBLIC_KEY, IMAGEKIT_PRIVATE_KEY and IMAGEKIT_URL_ENDPOINT must be set in .env",
            );
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
 * Delete a thumbnail from ImageKit by its internal fileId.
 */
export async function deleteThumbnail(imagekitFileId) {
    await getClient().files.delete(imagekitFileId);
}

/**
 * Returns true if the URL is already a permanent ImageKit URL.
 */
export function isImageKitUrl(url) {
    try {
        const expected = new URL(process.env.IMAGEKIT_URL_ENDPOINT);
        const actual = new URL(url);
        return (
            actual.protocol === "https:" &&
            actual.origin === expected.origin &&
            !actual.username &&
            !actual.password &&
            actual.pathname.startsWith(expected.pathname.replace(/\/$/, "") + "/")
        );
    } catch {
        return false;
    }
}

export default getClient;
