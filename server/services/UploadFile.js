import fs from "fs";
import { getAccessToken } from "../modules/onedrive/onedrive.controller.js";
import axios from "axios";
import { FileModel } from "../modules/course/course.model.js";
import Contribution from "../modules/contribution/contribution.model.js";
import logger from "../utils/logger.js";
import { logGraphError } from "../utils/graphError.js";
import { uploadThumbnail, deleteThumbnail } from "./imagekit.js";

const parent_item_id = process.env.ONEDRIVE_FOLDER_ID;

async function GetFolderId(contributionId) {
    const access_token = await getAccessToken();
    const url = `https://graph.microsoft.com/v1.0/me/drive/items/${parent_item_id}/children`;
    const config = {
        headers: {
            Authorization: `Bearer ${access_token}`,
        },
    };

    try {
        const { data } = await axios.get(url, config);
        const foundFolder = data?.value?.find((folder) => folder.name === contributionId);
        if (foundFolder) return foundFolder?.id;
        return false;
    } catch (error) {
        return false;
    }
}

async function CreateFolder(contributionId) {
    const access_token = await getAccessToken();
    const url = `https://graph.microsoft.com/v1.0/me/drive/items/${parent_item_id}/children`;
    const config = {
        headers: {
            Authorization: `Bearer ${access_token}`,
        },
    };
    
    const _data = {
        name: contributionId,
        folder: {},
        "@microsoft.graph.conflictBehavior": "fail",
    };
    
    try {
        const { data } = await axios.post(url, _data, config);
        return data.id;
    } catch (error) {
        if (error?.response?.status === 409) {
            const folderId = await GetFolderId(contributionId);
            return folderId;
        } else {
            return false;
        }
    }
}

async function createUploadSession(folderId, fileName) {
    const access_token = await getAccessToken();
    const url = `https://graph.microsoft.com/v1.0/me/drive/items/${folderId}:/${fileName}:/createUploadSession`;
    const config = {
        headers: {
            Authorization: `Bearer ${access_token}`,
        },
    };

    try {
        const { data } = await axios.post(url, {}, config);
        return { url: data?.uploadUrl, access_token };
    } catch (error) {
        logGraphError(logger, error, "Failed to create Graph upload session");
        return false;
    }
}

async function UploadFile(contributionId, filePath, fileName) {
    const folderId = parent_item_id;
    const session = await createUploadSession(folderId, fileName);
    if (!session?.url) {
        logger.error("Error uploading!");
        return null;
    }
    const { url, access_token } = session;
    const existingContribution = await Contribution.findOne({ contributionId });
    const file = fs.readFileSync(`${filePath}${fileName}`);
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
                }
            ),
            axios.get(thumbnaillink, {
                headers: { Authorization: `Bearer ${access_token}` },
            }),
        ]);

        const tempThumbnailUrl = thumbnaildata.data.value?.[0]?.medium?.url;
        const webUrl = urldata?.data?.link?.webUrl;

        const fileData = new FileModel({
            isVerified: !!existingContribution?.approved,
            fileId: data.id,
            size: data.size,
            thumbnail: tempThumbnailUrl ? { url: tempThumbnailUrl } : undefined,
            name: fileName,
            downloadUrl: `${webUrl}?download=1`,
            webUrl: webUrl,
        });
        await fileData.save();
        logger.info("File saved");

        // Upload thumbnail to ImageKit in the background — don't block the response
        if (tempThumbnailUrl) {
            (async () => {
                try {
                    const imgResponse = await axios.get(tempThumbnailUrl, { responseType: "arraybuffer" });
                    const { url: permanentUrl, fileId: imagekitFileId, path: imagekitPath } = await uploadThumbnail(data.id, Buffer.from(imgResponse.data));
                    await FileModel.updateOne(
                        { fileId: data.id },
                        {
                            thumbnail: {
                                url: permanentUrl,
                                fileId: imagekitFileId,
                                path: imagekitPath,
                            },
                        }
                    );
                    logger.info(`ImageKit thumbnail stored for ${data.id}`);
                } catch (thumbErr) {
                    logger.warn(`ImageKit thumbnail upload failed for ${data.id}: ${thumbErr.message}`);
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
    const access_token = await getAccessToken();

    // Delete ImageKit thumbnail in the background — don't block the response
    FileModel.findOne({ fileId }).lean().then((fileDoc) => {
        const imagekitId = fileDoc?.thumbnail?.fileId || fileDoc?.imagekitFileId;
        if (imagekitId) {
            deleteThumbnail(imagekitId).catch((ikErr) => {
                logger.warn(`ImageKit thumbnail deletion failed for ${fileId}: ${ikErr.message}`);
            });
        }
    }).catch(() => {});

    try {
        //obtain parent folder onedrive id
        const { data } = await axios.get(
            `https://graph.microsoft.com/v1.0/me/drive/items/${fileId}`,
            {
                headers: {
                    Authorization: `Bearer ${access_token}`,
                },
            }
        );
        const folderId = data?.parentReference?.id;

        //delete entire folder if it is the only file or delete only the file
        const empty = await isFolderEmpty(folderId, access_token);
        if (empty) {
            await axios.delete(`https://graph.microsoft.com/v1.0/me/drive/items/${folderId}`, {
                headers: {
                    Authorization: `Bearer ${access_token}`,
                },
            });
        } else {
            await axios.delete(`https://graph.microsoft.com/v1.0/me/drive/items/${fileId}`, {
                headers: {
                    Authorization: `Bearer ${access_token}`,
                },
            });
        }
    } catch (err) {
        logGraphError(logger, err, "Failed to delete file from Microsoft Graph");
    }
}

async function isFolderEmpty(folderId, access_token) {
    const { data } = await axios.get(
        `https://graph.microsoft.com/v1.0/me/drive/items/${folderId}/children`,
        {
            headers: {
                Authorization: `Bearer ${access_token}`,
            },
        }
    );

    if (data.value.length === 1) return true;
    else return false;
}

export { DeleteFile };
export default UploadFile;
