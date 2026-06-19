import axios from "axios";
import qs from "querystring";
import AppError from "../../utils/appError.js";
import settings from "../../config/onedrive.js";
import fs from "fs";
import { extractGraphErrorDetails, formatGraphErrorMessage } from "../../utils/graphError.js";
import { normalizeCourseCode, getCourseCodeCaseInsensitiveRegex } from "../../utils/course.js";
import { uploadThumbnail, isImageKitUrl } from "../../services/imagekit.js";

import CourseModel, { FolderModel, FileModel } from "../course/course.model.js";
import SearchResults from "../search/search.model.js";

const coursehub_id = process.env.ONEDRIVE_FOLDER_ID;

const getCourseCodeFromFolderName = (name) => normalizeCourseCode(name?.split("-")[0]);
const getCourseNameFromFolderName = (name) => name?.split("-")[1]?.trim() || "";

export async function generateDeviceCode(req, res) {
    const data = qs.stringify({
        tenant: settings.tenantId,
        client_id: settings.clientId,
        scope: "user.read offline_access files.readwrite",
    });

    const config = {
        method: "post",
        url: `https://login.microsoftonline.com/${settings.tenantId}/oauth2/v2.0/devicecode`,
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
        },
        data,
    };

    const response = await axios.post(config.url, config.data, {
        headers: config.headers,
    });

    if (!response.data) throw new AppError(500, "Something went wrong");

    console.log(response.data.user_code);

    fs.writeFileSync("./onedrive-device-code.token", response.data.device_code, "utf-8");
    if (fs.existsSync("./onedrive-access-token.token")) {
        fs.unlinkSync("./onedrive-access-token.token");
        fs.unlinkSync("./onedrive-refresh-token.token");
    }

    return res.status(200).json({
        status: "success",
        data: {
            message: response.data,
        },
    });
}

export async function getAccessCode(req, res) {
    const token = await getAccessToken();
    return res.status(200).json({
        status: "success",
        data: {
            access_token: token,
        },
    });
}

export async function makeAllCourses(req, res) {
    await visitAllFiles();
    return res.sendStatus(200);
}

export async function makeCourseById(req, res) {
    await visitCourseById(req.params.id);
    return res.sendStatus(200);
}

export async function getCourseIds(req, res) {
    const data = await getAllCourseIds();
    return res.send(data);
}

export async function thumbnail(req, res) {
    const fileId = req.body.fileId;

    // 1. Already a permanent ImageKit URL in DB — return immediately
    const file = await FileModel.findOne({ fileId }).select("thumbnail");
    const storedThumbnailUrl =
        typeof file?.thumbnail === "string"
            ? file.thumbnail
            : file?.thumbnail?.url;

    if (storedThumbnailUrl && isImageKitUrl(storedThumbnailUrl)) {
        return res.status(200).json(storedThumbnailUrl);
    }

    // 2. Fetch a fresh temporary URL from Graph API (legacy files with expired OneDrive URLs)
    const access_token = await getAccessToken();
    const thumbnaildata = await axios.get(
        `https://graph.microsoft.com/v1.0/me/drive/items/${fileId}/thumbnails`,
        { headers: { Authorization: `Bearer ${access_token}` } }
    );
    const thumbnailurl = thumbnaildata.data.value?.[0]?.medium?.url;
    if (!thumbnailurl) throw new AppError(404, "Thumbnail not found");

    // 3. Download raw image bytes and upload to ImageKit as WebP permanently
    const imgResponse = await axios.get(thumbnailurl, { responseType: "arraybuffer" });
    const { url: permanentUrl, fileId: imagekitFileId, path: imagekitPath } = await uploadThumbnail(fileId, Buffer.from(imgResponse.data));

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
        }
    );

    return res.status(200).json(permanentUrl);
}

export async function getFile(req, res) {
    const resp = await getFileDownloadLink(req.params.id);
    return res.json({ url: resp });
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

export async function getAllCourseIds() {
    const access_token = await getAccessToken();
    const headers = {
        Authorization: `Bearer ${access_token}`,
        Host: "graph.microsoft.com",
    };
    const url = `https://graph.microsoft.com/v1.0/me/drive/items/${coursehub_id}/children`;
    const data = await getRequest(url, headers);
    const children = data.value;
    const resp = [];
    children.map((child) => {
        resp.push({ name: child.name, id: child.id });
    });
    return resp;
}

async function visitAllFiles() {
    const access_token = await getAccessToken();
    const headers = {
        Authorization: `Bearer ${access_token}`,
        Host: "graph.microsoft.com",
    };
    const url = `https://graph.microsoft.com/v1.0/me/drive/items/${coursehub_id}/children`;
    const data = await getRequest(url, headers);
    const children = data.value;
    const folders = children.map(async (child) => {
        const folder_data = await visitFolder(child, child.name);
        return folder_data;
    });
    const resolved_folders = await Promise.all(folders);
    await Promise.all(resolved_folders.map(async (folder) => {
        const courseCode = getCourseCodeFromFolderName(folder.name);
        const courseName = getCourseNameFromFolderName(folder.name);
        await CourseModel.create({
            name: courseName,
            code: courseCode,
            children: folder.children,
        });
        const searchDocument = await SearchResults.findOne({
            code: getCourseCodeCaseInsensitiveRegex(courseCode),
        });
        console.log(searchDocument);
        if (!searchDocument) {
            await SearchResults.create({
                name: courseName,
                code: courseCode,
                isAvailable: true,
            });
            console.log("Created", folder.name);
        } else {
            await SearchResults.updateOne(
                { code: getCourseCodeCaseInsensitiveRegex(courseCode) },
                {
                    isAvailable: true,
                }
            );
            console.log("Updated", folder.name);
        }
    }));
    return "ok";
}

export async function visitCourseById(id) {
    const access_token = await getAccessToken();
    const headers = {
        Authorization: `Bearer ${access_token}`,
        Host: "graph.microsoft.com",
    };
    const url = `https://graph.microsoft.com/v1.0/me/drive/items/${coursehub_id}/children`;
    const data = await getRequest(url, headers);
    const children = data.value;
    const required_course = children.find((course) => course.id === id);
    if (!required_course) throw new AppError(404, "Not Found!");
    const folder_data = await visitFolder(required_course, required_course.name);
    const courseCode = getCourseCodeFromFolderName(required_course.name);
    const courseName = getCourseNameFromFolderName(required_course.name);

    await CourseModel.create({
        name: courseName,
        code: courseCode,
        children: folder_data.children,
    });
    const searchDocument = await SearchResults.findOne({
        code: getCourseCodeCaseInsensitiveRegex(courseCode),
    });
    if (!searchDocument) {
        await SearchResults.create({
            name: courseName,
            code: courseCode,
            isAvailable: true,
        });
        console.log("Created", required_course.name);
    } else {
        await SearchResults.updateOne(
            { code: getCourseCodeCaseInsensitiveRegex(courseCode) },
            {
                isAvailable: true,
            }
        );
        console.log("Updated", required_course.name);
    }

    return "ok";
}

async function visitFolder(folder, currCourse, prevFolder) {
    const access_token = await getAccessToken();
    const headers = {
        Authorization: `Bearer ${access_token}`,
        Host: "graph.microsoft.com",
    };
    const url = `https://graph.microsoft.com/v1.0/me/drive/items/${folder.id}/children?$expand=thumbnails`;
    const data = await getRequest(url, headers);
    const children = data.value;
    const normalizedCourseCode = getCourseCodeFromFolderName(currCourse);
    let childType = "File";

    const folders = children.map(async function (child) {
        if (child.folder) {
            const prevFolderName = prevFolder ? `${prevFolder}/` : "";
            const passName = prevFolderName + folder.name;
            childType = "Folder";
            const nestedData = await visitFolder(child, normalizedCourseCode, passName);
            return nestedData;
        }

        const fileData = await visitFile(child, normalizedCourseCode);
        return fileData;
    });

    const res = await Promise.all(folders);
    const prevFolderName = prevFolder ? `${prevFolder}/` : "root/";
    const NewFolder = await FolderModel.create({
        courses: [normalizedCourseCode],
        name: folder.name,
        childType,
        children: res,
        path: prevFolderName,
        id: folder.id,
    });
    return NewFolder;
}

async function visitFile(file, currCourse) {
    const NewFile = await FileModel.create({
        course: normalizeCourseCode(currCourse),
        name: file.name,
        id: file.id,
        size: file.size * 0.000001,
        thumbnail: {
            url: file?.thumbnails?.[0]?.medium?.url || "null",
        },
    });
    return NewFile._id;
}

// export async function getAccessToken() {
//     let data;
//     if (fs.existsSync("./onedrive-refresh-token.token")) {
//         data = await refreshAccessToken();
//     } else {
//         data = await generateAccessToken();
//     }
//     return data.access_token;
// }
let cachedAccessToken = null;
let tokenExpiry = 0;

export async function getAccessToken() {

    if (
        cachedAccessToken &&
        Date.now() < tokenExpiry
    ) {
        console.log("Using cached token");
        return cachedAccessToken;
    }

    console.log("Fetching fresh token");

    let data;

    if (fs.existsSync("./onedrive-refresh-token.token")) {
        data = await refreshAccessToken();
    } else {
        data = await generateAccessToken();
    }

    cachedAccessToken = data.access_token;

    tokenExpiry =
        Date.now() +
        (data.expires_in - 60) * 1000;

    return cachedAccessToken;
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
    fs.writeFileSync("./onedrive-refresh-token.token", response.data.refresh_token, "utf-8");

    return response.data;
}

async function generateAccessToken() {
    const data = qs.stringify({
        tenant: settings.tenantId,
        client_id: settings.clientId,
        device_code: `${fs.readFileSync("./onedrive-device-code.token", "utf-8")}`,
        grant_type: "urn:ietf:params:oauth:grant-type:device_code",
    });

    const config = {
        method: "post",
        url: `https://login.microsoftonline.com/${settings.tenantId}/oauth2/v2.0/token`,
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
        },
        data,
    };
    const response = await axios.post(config.url, config.data, {
        headers: config.headers,
    });

    if (!response.data) throw new AppError(500, "Something went wrong");

    fs.writeFileSync("./onedrive-access-token.token", response.data.access_token, "utf-8");
    fs.writeFileSync("./onedrive-refresh-token.token", response.data.refresh_token, "utf-8");

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
            formatGraphErrorMessage(details, "Microsoft Graph GET request failed")
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
            formatGraphErrorMessage(details, "Microsoft Graph POST request failed")
        );
        appError.graphDetails = details;
        throw appError;
    }
}
