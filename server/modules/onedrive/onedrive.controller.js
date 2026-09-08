import axios from "axios";
import qs from "querystring";
import AppError from "../../utils/appError.js";
import settings from "../../config/onedrive.js";
import fs from "fs";
import { extractGraphErrorDetails, formatGraphErrorMessage } from "../../utils/graphError.js";
import { uploadThumbnail, isImageKitUrl } from "../../services/imagekit.js";

import { FileModel } from "../course/course.model.js";

export async function thumbnail(req, res) {
    const fileId = req.body.fileId;

    // 1. Already a permanent ImageKit URL in DB - return immediately.
    const file = await FileModel.findOne({ fileId }).select("thumbnail").lean();
    const storedThumbnailUrl =
        typeof file?.thumbnail === "string" ? file.thumbnail : file?.thumbnail?.url;

    if (storedThumbnailUrl && isImageKitUrl(storedThumbnailUrl)) {
        return res.status(200).json(storedThumbnailUrl);
    }

    // 2. Fetch a fresh temporary URL from Graph API (legacy files with expired OneDrive URLs)
    const access_token = await getAccessToken();
    const thumbnaildata = await axios.get(
        `https://graph.microsoft.com/v1.0/me/drive/items/${fileId}/thumbnails`,
        { headers: { Authorization: `Bearer ${access_token}` } },
    );
    const thumbnailurl = thumbnaildata.data.value?.[0]?.medium?.url;
    if (!thumbnailurl) throw new AppError(404, "Thumbnail not found");

    // 3. Download raw image bytes and upload to ImageKit as WebP permanently
    const imgResponse = await axios.get(thumbnailurl, { responseType: "arraybuffer" });
    const {
        url: permanentUrl,
        fileId: imagekitFileId,
        path: imagekitPath,
    } = await uploadThumbnail(fileId, Buffer.from(imgResponse.data));

    // 4. Persist permanent URL to DB so this file never hits Graph API again
    await FileModel.updateOne(
        { fileId },
        {
            $set: {
                thumbnail: {
                    url: permanentUrl,
                    fileId: imagekitFileId,
                    path: imagekitPath,
                },
            },
        },
    );

    return res.status(200).json(permanentUrl);
}

export async function getFilePreview(req, res) {
    const { fileID } = req.params;
    const resp = await getFileWebUrl(fileID);
    return res.json({ url: resp });
}

export async function getFileDownload(req, res) {
    const { fileID } = req.params;
    const resp = await getFileDownloadLink(fileID);
    return res.json({ url: resp });
}

async function getFileDownloadLink(file_id) {
    const access_token = await getAccessToken();
    const headers = {
        Authorization: `Bearer ${access_token}`,
        Host: "graph.microsoft.com",
    };
    const url = `https://graph.microsoft.com/v1.0/me/drive/items/${file_id}`;
    const data = await getRequest(url, headers);
    return data["@microsoft.graph.downloadUrl"];
}

async function getFileWebUrl(file_id) {
    const access_token = await getAccessToken();
    const headers = {
        Authorization: `Bearer ${access_token}`,
        Host: "graph.microsoft.com",
    };

    const url = `https://graph.microsoft.com/v1.0/me/drive/items/${file_id}/createLink`;

    const data = await postRequest(url, headers);
    return data.link.webUrl;
}

let cachedAccessToken = null;
let tokenExpiry = 0;
let refreshPromise = null;
export async function getAccessToken() {
    if (cachedAccessToken && Date.now() < tokenExpiry) {
        return cachedAccessToken;
    }
    if (refreshPromise) {
        return await refreshPromise;
    }

    refreshPromise = (async () => {
        let data;

        if (!fs.existsSync("./onedrive-refresh-token.token")) {
            throw new AppError(503, "OneDrive authorization is not provisioned");
        }
        data = await refreshAccessToken();

        cachedAccessToken = data.access_token;

        tokenExpiry = Date.now() + (data.expires_in - 60) * 1000;

        return cachedAccessToken;
    })();
    try {
        return await refreshPromise;
    } finally {
        refreshPromise = null;
    }
}

export function clearAccessTokenCache() {
    cachedAccessToken = null;
    tokenExpiry = 0;
    refreshPromise = null;
}

async function refreshAccessToken() {
    const data = qs.stringify({
        client_id: settings.clientId,
        client_secret: settings.clientSecret,
        refresh_token: `${fs.readFileSync("./onedrive-refresh-token.token", "utf-8")}`,
        grant_type: "refresh_token",
    });

    const config = {
        method: "post",
        url: `https://login.microsoftonline.com/${settings.tenantId}/oauth2/v2.0/token`,
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Host: "login.microsoftonline.com",
        },
        data,
    };
    const response = await axios.post(config.url, config.data, {
        headers: config.headers,
    });

    if (!response.data) throw new AppError(500, "Something went wrong");

    fs.writeFileSync("./onedrive-access-token.token", response.data.access_token, "utf-8");
    if (response.data.refresh_token) {
        fs.writeFileSync("./onedrive-refresh-token.token", response.data.refresh_token, "utf-8");
    }

    return response.data;
}

export async function getRequest(url, headers) {
    const config = {
        method: "get",
        url,
        headers,
    };

    try {
        const response = await axios.get(config.url, {
            headers: config.headers,
        });

        if (!response.data) throw new AppError(500, "Something went wrong");

        return response.data;
    } catch (error) {
        const details = extractGraphErrorDetails(error);
        const appError = new AppError(
            details.status || 502,
            formatGraphErrorMessage(details, "Microsoft Graph GET request failed"),
        );
        appError.graphDetails = details;
        throw appError;
    }
}

export async function postRequest(url, headers, params) {
    const data = qs.stringify(params);
    const config = {
        method: "post",
        url,
        headers,
        data,
    };

    try {
        const response = await axios.post(config.url, config.data, {
            headers: config.headers,
        });

        if (!response.data) throw new AppError(500, "Something went wrong");

        return response.data;
    } catch (error) {
        const details = extractGraphErrorDetails(error);
        const appError = new AppError(
            details.status || 502,
            formatGraphErrorMessage(details, "Microsoft Graph POST request failed"),
        );
        appError.graphDetails = details;
        throw appError;
    }
}
