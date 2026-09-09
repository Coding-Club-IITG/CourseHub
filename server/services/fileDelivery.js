import { pipeline } from "node:stream/promises";
import { requireFile } from "./authorization.js";
import { storage } from "./storage.js";
import { thumbnailStream } from "./thumbnails.js";
import AppError from "../utils/appError.js";

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
        ) {
            await storage.withinRoot(file.fileId);
            return res.redirect(url.href);
        }
    }
    if (
        /\.(doc|docx|dot|dotx|dotm|odp|ods|odt|pps|ppsx|ppt|pptx|rtf|xls|xlsm|xlsx)$/i.test(
            file.name,
        )
    )
        req.previewAsPdf = true;
    return fileContent(req, res);
}

export async function fileContent(req, res) {
    const { file } = await requireFile(req, req.params.id, req.query.courseCode);
    const controller = new AbortController();
    res.once("close", () => controller.abort());
    const response = await storage.content(file.fileId, {
        signal: controller.signal,
        ...(req.previewAsPdf ? { format: "pdf" } : {}),
    });
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
        `${inline ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(req.previewAsPdf ? file.name.replace(/\.[^.]+$/, ".pdf") : file.name)}`,
    );
    if (response.headers["content-length"])
        res.setHeader("Content-Length", response.headers["content-length"]);
    res.on("close", () => response.data.destroy());
    await pipeline(response.data, res);
}

export async function fileThumbnail(req, res) {
    const { file } = await requireFile(req, req.params.id, req.query.courseCode);
    const controller = new AbortController();
    res.once("close", () => controller.abort());
    const response = await thumbnailStream(file, { signal: controller.signal });
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
