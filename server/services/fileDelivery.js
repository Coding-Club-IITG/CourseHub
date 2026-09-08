import axios from "axios";
import { pipeline } from "node:stream/promises";
import { requireFile } from "./authorization.js";
import { getAccessToken } from "../modules/onedrive/onedrive.controller.js";
import AppError from "../utils/appError.js";
import { isImageKitUrl } from "./imagekit.js";

export async function filePreview(req, res) {
    const { file } = await requireFile(req, req.params.id, req.query.courseCode);
    // Keep Office's viewer for existing provider links after the visibility check.
    if (!/\.(pdf|png|jpe?g|webp|gif)$/i.test(file.name)) {
        let url;
        try {
            url = new URL(file.webUrl);
        } catch {
            /* Use authenticated content instead. */
        }
        if (
            url?.protocol === "https:" &&
            /(^|\.)(sharepoint\.com|onedrive\.live\.com|1drv\.ms)$/i.test(url.hostname)
        )
            return res.redirect(url.href);
    }
    return fileContent(req, res);
}

export async function fileContent(req, res) {
    const { file } = await requireFile(req, req.params.id, req.query.courseCode);
    const token = await getAccessToken();
    const response = await axios.get(
        `https://graph.microsoft.com/v1.0/me/drive/items/${encodeURIComponent(file.fileId)}/content`,
        {
            headers: { Authorization: `Bearer ${token}` },
            responseType: "stream",
        },
    );
    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    const contentType = response.headers["content-type"] || "application/octet-stream";
    res.setHeader("Content-Type", contentType);
    // Inline only passive document/image formats
    const inline =
        req.query.download !== "1" &&
        /^(application\/pdf|image\/(png|jpeg|webp|gif))(;|$)/i.test(contentType);
    res.setHeader(
        "Content-Disposition",
        `${inline ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(file.name)}`,
    );
    if (response.headers["content-length"])
        res.setHeader("Content-Length", response.headers["content-length"]);
    res.on("close", () => response.data.destroy());
    await pipeline(response.data, res);
}

export async function fileThumbnail(req, res) {
    const { file } = await requireFile(req, req.params.id, req.query.courseCode);
    let url = typeof file.thumbnail === "string" ? file.thumbnail : file.thumbnail?.url;
    if (!url || !isImageKitUrl(url)) {
        const token = await getAccessToken();
        const { data } = await axios.get(
            `https://graph.microsoft.com/v1.0/me/drive/items/${encodeURIComponent(file.fileId)}/thumbnails`,
            {
                headers: { Authorization: `Bearer ${token}` },
            },
        );
        url = data.value?.[0]?.medium?.url;
    }
    if (!url) throw new AppError(404, "Thumbnail not found");
    const response = await axios.get(url, { responseType: "stream" });
    const type = response.headers["content-type"] || "";
    if (!/^image\/(png|jpeg|webp|gif)(;|$)/i.test(type)) {
        response.data.destroy();
        throw new AppError(502, "Thumbnail unavailable");
    }
    res.setHeader("Content-Type", type);
    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.on("close", () => response.data.destroy());
    await pipeline(response.data, res);
}
