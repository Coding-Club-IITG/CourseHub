import express from "express";
import axios from "axios";
import qs from "querystring";
import catchAsync from "../../utils/catchAsync.js";
import AppError from "../../utils/appError.js";
import settings from "../../config/onedrive.js";
import fs from "fs";

import CourseModel, { FolderModel, FileModel } from "../course/course.model.js";
import path from "path";

const router = express.Router();

const drive_id = "b!pxmuhRkkIESn1NJOh3iVay2m314xO8NGtXVieZjVnTQBFLWQU0FfSqSeomGkWOvO";
const coursehub_id = "01OXYV37Y64PLOWXJRRBGKGSMVOFLO3OPZ";

import { MakeImagekitFolder, UploadImage } from "../../services/UploadImage.js";
import SearchResults from "../search/search.model.js";
// router.post("/upload", async (req, res) => {
//     // fs.writeFile(__dirname + "/output.pdf", req.file?.buffer, (err: any) => {
//     //     if (err) {
//     //         console.error(err);
//     //     }
//     // });
//     await handleUpload(req.file?.buffer);
//     res.sendStatus(200);
// });
// async function handleUpload(file) {
//     try {
//         var access_token = await generateAccessToken();
//         console.log(access_token);
//         var headers = {
//             Authorization: `Bearer ${access_token}`,
//         };
//         const resp = await axios.put(
//             "https://graph.microsoft.com/v1.0/me/drive/items/01OXYV374UNHP7FBR4UVBLPK2WPXMCR2TW:/test.txt:/content",
//             file
//         );
//         console.log(resp.data);
//         return resp.data;
//     } catch (error) {
//         console.log(error);
//     }
// }

router.get(
    "/generatedevicecode",
    catchAsync(async (req, res) => {
        var data = qs.stringify({
            tenant: settings.tenantId,
            client_id: settings.clientId,
            scope: "user.read offline_access files.readwrite",
        });

        var config = {
            method: "post",
            url: `https://login.microsoftonline.com/${settings.authTenant}/oauth2/v2.0/devicecode`,
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            data: data,
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

        //res.redirect(`https://microsoft.com/devicelogin`);

        res.status(200).json({
            status: "success",
            data: {
                message: response.data,
            },
        });
    })
);

router.get(
    "/getaccesscode",
    catchAsync(async (req, res) => {
        var token = await getAccessToken();
        res.status(200).json({
            status: "success",
            data: {
                access_token: token,
            },
        });
    })
);

router.get(
    "/makeAllCourses",
    catchAsync(async (req, res) => {
        var data = await visitAllFiles();
        res.sendStatus(200);
    })
);

router.get(
    "/makeCourseById/:id",
    catchAsync(async (req, res, next) => {
        var data = await visitCourseById(req.params.id);
        res.sendStatus(200);
    })
);

router.get(
    "/getCourseIds",
    catchAsync(async (req, res, next) => {
        var data = await getAllCourseIds();
        res.send(data);
    })
);

router.get(
    "/:id",
    catchAsync(async (req, res, next) => {
        const resp = await getFileDownloadLink(req.params.id);
        res.json({ url: resp });
    })
);

router.get(
    "/preview/:fileID",
    catchAsync(async (req, res, next) => {
        const { fileID } = req.params;
        const resp = await getFileWebUrl(fileID);
        res.json({ url: resp });
    })
);
router.get(
    "/download/:fileID",
    catchAsync(async (req, res, next) => {
        const { fileID } = req.params;
        const resp = await getFileDownloadLink(fileID);
        res.json({ url: resp });
    })
);

async function getFileDownloadLink(file_id) {
    var access_token = await getAccessToken();
    var headers = {
        Authorization: `Bearer ${access_token}`,
        Host: "graph.microsoft.com",
    };
    var url = `https://graph.microsoft.com/v1.0/me/drive/items/${file_id}`;
    var data = await getRequest(url, headers);
    return data["@microsoft.graph.downloadUrl"];
}
async function getFileWebUrl(file_id) {
    var access_token = await getAccessToken();
    var headers = {
        Authorization: `Bearer ${access_token}`,
        Host: "graph.microsoft.com",
    };

    var url = `https://graph.microsoft.com/v1.0/me/drive/items/${file_id}/createLink`;

    var data = await postRequest(url, headers);
    return data.link.webUrl;
}

export async function getAllCourseIds() {
    var access_token = await getAccessToken();
    var headers = {
        Authorization: `Bearer ${access_token}`,
        Host: "graph.microsoft.com",
    };
    var url = `https://graph.microsoft.com/v1.0/me/drive/items/${coursehub_id}/children`;
    var data = await getRequest(url, headers);
    var children = data.value;
    const resp = [];
    children.map((child) => {
        resp.push({ name: child.name, id: child.id });
    });
    return resp;
}

async function visitAllFiles() {
    var access_token = await getAccessToken();
    var headers = {
        Authorization: `Bearer ${access_token}`,
        Host: "graph.microsoft.com",
    };
    var url = `https://graph.microsoft.com/v1.0/me/drive/items/${coursehub_id}/children`;
    var data = await getRequest(url, headers);
    var children = data.value;
    const folders = children.map(async (child, idx) => {
        const folder_data = await visitFolder(child, child.name.toLowerCase());
        return folder_data;
    });
    const resolved_folders = await Promise.all(folders);
    resolved_folders.map(async (folder) => {
        await CourseModel.create({
            name: folder.name.split("-")[1].trim().toLowerCase(),
            code: folder.name.split("-")[0].trim().toLowerCase(),
            children: folder.children,
        });
        const searchDocument = await SearchResults.find({
            code: folder.name.split("-")[0].trim().toLowerCase(),
        });
        console.log(searchDocument);
        if (!searchDocument) {
            await SearchResults.create({
                name: folder.name.split("-")[1].trim().toLowerCase(),
                code: folder.name.split("-")[0].trim().toLowerCase(),
                isAvailable: true,
            });
            console.log("Created", folder.name);
        } else {
            await SearchResults.updateOne(
                { code: folder.name.split("-")[0].trim().toLowerCase() },
                {
                    isAvailable: true,
                }
            );
            console.log("Updated", folder.name);
        }
    });
    return "ok";
}

export async function visitCourseById(id) {
    var access_token = await getAccessToken();
    var headers = {
        Authorization: `Bearer ${access_token}`,
        Host: "graph.microsoft.com",
    };
    var url = `https://graph.microsoft.com/v1.0/me/drive/items/${coursehub_id}/children`;
    var data = await getRequest(url, headers);
    var children = data.value;
    const required_course = children.find((course) => course.id === id);
    // console.log(required_course);
    if (!required_course) throw new AppError(404, "Not Found!");
    const imagekitfoldercreated = await MakeImagekitFolder(
        required_course.name.split("-")[0].trim().toLowerCase()
    );
    if (!imagekitfoldercreated) throw new AppError(500, "Imagekit folder creation error");
    const folder_data = await visitFolder(required_course, required_course.name.toLowerCase());

    await CourseModel.create({
        name: required_course.name.split("-")[1].trim().toLowerCase(),
        code: required_course.name.split("-")[0].trim().toLowerCase(),
        children: folder_data.children,
    });
    const searchDocument = await SearchResults.findOne({
        code: required_course.name.split("-")[0].trim().toLowerCase(),
    });
    // console.log(searchDocument);
    if (!searchDocument) {
        await SearchResults.create({
            name: required_course.name.split("-")[1].trim().toLowerCase(),
            code: required_course.name.split("-")[0].trim().toLowerCase(),
            isAvailable: true,
        });
        console.log("Created", required_course.name);
    } else {
        await SearchResults.updateOne(
            { code: required_course.name.split("-")[0].trim().toLowerCase() },
            {
                isAvailable: true,
            }
        );
        console.log("Updated", required_course.name);
    }

    return "ok";
}

async function visitFolder(folder, currCourse, prevFolder) {
    var access_token = await getAccessToken();
    var headers = {
        Authorization: `Bearer ${access_token}`,
        Host: "graph.microsoft.com",
    };
    var url = `https://graph.microsoft.com/v1.0/me/drive/items/${folder.id}/children?$expand=thumbnails`;
    var data = await getRequest(url, headers);
    var children = data.value;
    var childType = "File";

    const folders = children.map(async function (child) {
        if (child.folder) {
            const prevFolderName = prevFolder ? `${prevFolder}/` : "";
            const passName = prevFolderName + folder.name;
            // console.log(passName);
            childType = "Folder";
            let data = await visitFolder(child, currCourse, passName);
            return data;
        } else {
            let data = await visitFile(child, currCourse);
            return data;
        }
    });

    let res = await Promise.all(folders);
    const prevFolderName = prevFolder ? `${prevFolder}/` : "root/";
    // console.log(prevFolderName + folder.name);
    const NewFolder = await FolderModel.create({
        course: currCourse.split("-")[0].trim().toLowerCase(),
        name: folder.name,
        childType: childType,
        children: res,
        path: prevFolderName,
        id: folder.id,
    });
    return NewFolder;
}

async function visitFile(file, currCourse) {
    //var previewUrl = await getFilePreviewLink(file.id);

    var file_urls = {
        //previewUrl: previewUrl,
        downloadUrl: file["@microsoft.graph.downloadUrl"],
        webUrl: file.webUrl,
    };
    // const thumbnail = await getThumbnail(file.id);

    const uploadedImage = await UploadImage(
        file?.thumbnails[0]?.medium?.url,
        file.id,
        currCourse.split("-")[0].trim().toLowerCase()
    );
    // console.log(uploadedImage);
    //make mongoose file
    const NewFile = await FileModel.create({
        course: currCourse,
        name: file.name,
        id: file.id,
        // webUrl: file.webUrl,
        size: file.size * 0.000001,
        thumbnail: uploadedImage?.url ? uploadedImage.url : "null",
        // downloadUrl: file["@microsoft.graph.downloadUrl"],
    });
    return NewFile._id;
}

async function getFilePreviewLink(file_id) {
    var access_token = await getAccessToken();
    var headers = {
        Authorization: `Bearer ${access_token}`,
        Host: "graph.microsoft.com",
        "Content-Type": "application/json",
    };
    var params = {
        viewer: "onedrive",
        allowEdit: true,
    };
    var url = `https://graph.microsoft.com/v1.0/me/drive/items/${file_id}/preview`;
    var data = await postRequest(url, headers, params);
    return data.getUrl;
}

export async function getAccessToken() {
    var data;
    if (fs.existsSync("./onedrive-refresh-token.token")) {
        data = await refreshAccessToken();
    } else {
        data = await generateAccessToken();
    }
    //console.log(data);
    return data.access_token;
}

async function refreshAccessToken() {
    var data = qs.stringify({
        tenant: settings.tenantId,
        client_id: settings.clientId,
        refresh_token: `${fs.readFileSync("./onedrive-refresh-token.token", "utf-8")}`,
        grant_type: "refresh_token",
    });

    var config = {
        method: "post",
        url: `https://login.microsoftonline.com/${settings.authTenant}/oauth2/v2.0/token`,
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Host: "login.microsoftonline.com",
        },
        data: data,
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
    var data = qs.stringify({
        tenant: settings.tenantId,
        client_id: settings.clientId,
        device_code: `${fs.readFileSync("./onedrive-device-code.token", "utf-8")}`,
        grant_type: "urn:ietf:params:oauth:grant-type:device_code",
    });

    var config = {
        method: "post",
        url: `https://login.microsoftonline.com/${settings.authTenant}/oauth2/v2.0/token`,
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
        },
        data: data,
    };
    const response = await axios.post(config.url, config.data, {
        headers: config.headers,
    });

    if (!response.data) throw new AppError(500, "Something went wrong");
    //console.log(response.data);

    fs.writeFileSync("./onedrive-access-token.token", response.data.access_token, "utf-8");
    fs.writeFileSync("./onedrive-refresh-token.token", response.data.refresh_token, "utf-8");

    return response.data;
}

export async function getRequest(url, headers) {
    //var data = qs.stringify(params);
    var config = {
        method: "get",
        url: url,
        headers: headers,
    };

    const response = await axios.get(config.url, {
        headers: config.headers,
    });

    if (!response.data) throw new AppError(500, "Something went wrong");

    return response.data;
}

async function postRequest(url, headers, params) {
    var data = qs.stringify(params);
    var config = {
        method: "post",
        url: url,
        headers: headers,
        data: data,
    };

    const response = await axios.post(config.url, config.data, {
        headers: config.headers,
    });

    if (!response.data) throw new AppError(500, "Something went wrong");

    return response.data;
}

export default router;
