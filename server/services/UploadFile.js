import fs from "fs";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { getAccessToken } from "../modules/onedrive/onedrive.controller.js";
import axios from "axios";
import { FileModel } from "../modules/course/course.model.js";
import logger from "../utils/logger.js";
import { logGraphError } from "../utils/graphError.js";
import { uploadThumbnail } from "./imagekit.js";

const parent_item_id = process.env.ONEDRIVE_FOLDER_ID;

async function createUploadSession(folderId, fileName) {
    try {
        const access_token = await getAccessToken();
        const url = `https://graph.microsoft.com/v1.0/me/drive/items/${folderId}:/${encodeURIComponent(fileName)}:/createUploadSession`;
        const config = {
            headers: {
                Authorization: `Bearer ${access_token}`,
            },
        };

        const { data } = await axios.post(url, {}, config);
        return { url: data?.uploadUrl, access_token };
    } catch (error) {
        logGraphError(logger, error, "Failed to create Graph upload session");
        return false;
    }
}

async function UploadFile(filePath, fileName, approved) {
    const folderId = parent_item_id;
    const session = await createUploadSession(folderId, randomUUID() + path.extname(fileName));
    if (!session?.url) {
        logger.error("File upload failed", {
            attributes: {
                dependency: "microsoft-graph",
                operation: "upload-file",
                outcome: "failure",
                retryable: true,
            },
        });
        return null;
    }
    const { url, access_token } = session;
    const file = fs.readFileSync(filePath);
    const config = {
        headers: {
            "Content-Range": `bytes 0-${file.length - 1}/${file.length}`,
        },
    };
    try {
        const { data } = await axios.put(url, file, config);
        const createurllink = `https://graph.microsoft.com/v1.0/me/drive/items/${data.id}/createLink`;
        const thumbnaillink = `https://graph.microsoft.com/v1.0/me/drive/items/${data.id}/thumbnails`;

        // Run createLink and thumbnail fetch in parallel
        const [urldata, thumbnaildata] = await Promise.all([
            axios.post(
                createurllink,
                { type: "view", scope: "organization" },
                {
                    headers: {
                        Authorization: `Bearer ${access_token}`,
                        "Content-Type": "application/json",
                    },
                },
            ),
            axios.get(thumbnaillink, {
                headers: { Authorization: `Bearer ${access_token}` },
            }),
        ]);

        const tempThumbnailUrl = thumbnaildata.data.value?.[0]?.medium?.url;
        const webUrl = urldata?.data?.link?.webUrl;

        const fileData = new FileModel({
            isVerified: approved === true,
            fileId: data.id,
            size: data.size,
            thumbnail: tempThumbnailUrl ? { url: tempThumbnailUrl } : undefined,
            name: fileName,
            downloadUrl: `${webUrl}?download=1`,
            webUrl: webUrl,
        });
        await fileData.save();
        logger.info("File saved");

        // Upload thumbnail to ImageKit in the background - don't block the response
        if (tempThumbnailUrl) {
            (async () => {
                try {
                    const imgResponse = await axios.get(tempThumbnailUrl, {
                        responseType: "arraybuffer",
                    });
                    const {
                        url: permanentUrl,
                        fileId: imagekitFileId,
                        path: imagekitPath,
                    } = await uploadThumbnail(data.id, Buffer.from(imgResponse.data));
                    await FileModel.updateOne(
                        { fileId: data.id },
                        {
                            thumbnail: {
                                url: permanentUrl,
                                fileId: imagekitFileId,
                                path: imagekitPath,
                            },
                        },
                    );
                    logger.info("ImageKit thumbnail stored", {
                        attributes: {
                            dependency: "imagekit",
                            operation: "store-thumbnail",
                            outcome: "success",
                        },
                    });
                } catch (thumbErr) {
                    logger.warn("ImageKit thumbnail upload failed", {
                        error: thumbErr,
                        attributes: {
                            dependency: "imagekit",
                            operation: "store-thumbnail",
                            outcome: "failure",
                            retryable: true,
                        },
                    });
                }
            })();
        }

        return fileData._id;
    } catch (error) {
        logGraphError(logger, error, "Failed to upload file to Microsoft Graph");
        return null;
    }
}

async function DeleteFile(fileId) {
    if (!fileId || fileId === parent_item_id) throw new Error("Storage root cannot be deleted");
    const access_token = await getAccessToken();
    await axios
        .delete(`https://graph.microsoft.com/v1.0/me/drive/items/${encodeURIComponent(fileId)}`, {
            headers: { Authorization: `Bearer ${access_token}` },
        })
        .catch((error) => {
            if (error.response?.status !== 404) throw error;
        });
}

async function RenameOneDriveFile(fileId, newName) {
    try {
        const access_token = await getAccessToken();
        const url = `https://graph.microsoft.com/v1.0/me/drive/items/${fileId}`;
        const config = {
            headers: {
                Authorization: `Bearer ${access_token}`,
                "Content-Type": "application/json",
            },
        };
        const _data = {
            name: randomUUID() + path.extname(newName),
        };
        const { data } = await axios.patch(url, _data, config);
        return data;
    } catch (err) {
        logGraphError(logger, err, `Failed to rename OneDrive file: ${fileId} to ${newName}`);
        throw err;
    }
}

export { DeleteFile, RenameOneDriveFile };
export default UploadFile;
