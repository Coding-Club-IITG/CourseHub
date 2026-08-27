import Contribution from "./contribution.model.js";
import Joi from "joi";
import AppError from "../../utils/appError.js";
import validatePayload from "../../utils/validate.js";
import UploadFile from "../../services/UploadFile.js";
import fs from "fs";
import path from "path";
import { FolderModel, FileModel } from "../course/course.model.js";
import logger from "../../utils/logger.js";
import { normalizeCourseCode, getCourseCodeCaseInsensitiveRegex } from "../../utils/course.js";
import { recalculateParentFolderCounts } from "../../utils/folder.js";
import { getAccessToken, clearAccessTokenCache } from "../onedrive/onedrive.controller.js";
import axios from "axios";

async function ContributionCreation(contributionId, data) {
    const existingContribution = await Contribution.findOne({ contributionId });
    if (!existingContribution) {
        const newContribution = await Contribution.create({ ...data, contributionId });
        return newContribution;
    }
    const updatedContribution = await Contribution.findOneAndUpdate(
        { contributionId },
        { ...data },
        { new: true }
    );
    return updatedContribution;
}

async function HandleFileToDB(contributionId, fileId) {
    const existingContribution = await Contribution.findOne({ contributionId });

    if (!existingContribution) {
        const newContribution = await Contribution.create({ contributionId, files: [fileId] });
        return newContribution;
    }

    const parentFolder = existingContribution.parentFolder
        ? await FolderModel.findOne({ _id: existingContribution.parentFolder })
        : null;

    existingContribution.files.push(fileId);
    if (parentFolder) {
        parentFolder.children.push(fileId);
        await parentFolder.save();
        await recalculateParentFolderCounts(parentFolder._id);
    }
    await existingContribution.save();
    return existingContribution;
}

async function GetAllContributions(req, res, next) {
    const allContributions = await Contribution.find({});
    res.json(allContributions);
}

async function HandleFileUpload(req, res, next) {
    logger.info("Handling File Upload");
    const contributionId = req.headers["contribution-id"];
    const username = req.headers.username || "user";
    const files = req.files;
    if (!files || files.length === 0) {
        return res.status(400).json({ error: "No files were uploaded" });
    }

    const uploadedFiles = [];

    for (const file of files) {
        try {
            let initialPath = file.path;
            let originalFilename = file.originalname;

            let wordArr = originalFilename.split(".");
            let fileExtension = wordArr.length > 1 ? wordArr.pop() : "";
            let baseName = wordArr.join(".");
            let finalFileName = `${baseName}~${username}${fileExtension ? "." + fileExtension : ""}`;

            const dirName = path.dirname(initialPath);
            const renamedPath = path.join(dirName, finalFileName);

            await fs.promises.rename(initialPath, renamedPath);

            // UploadFile expects directory path ending with slash/backslash
            const finalDirPath = dirName.endsWith(path.sep) ? dirName : `${dirName}${path.sep}`;
            let fileId = null;

            try {
                fileId = await UploadFile(contributionId, finalDirPath, finalFileName);
            } catch (uploadError) {
                logger.error("Contribution upload failed", { error: uploadError, attributes: { dependency: "microsoft-graph", operation: "upload-contribution", outcome: "failure", retryable: true } });
            }

            if (fileId) {
                await HandleFileToDB(contributionId, fileId);
                uploadedFiles.push(fileId.toString());
            }

            // Cleanup local temp file
            if (fs.existsSync(renamedPath)) {
                await fs.promises.unlink(renamedPath).catch(() => {});
            }
        } catch (err) {
            logger.error("Contribution file processing failed", { error: err, attributes: { operation: "process-contribution", outcome: "failure", retryable: false } });
        }
    }

    if (uploadedFiles.length === 0) {
        return res.status(500).json({ error: "File upload failed" });
    }

    // Return the primary file ID string or response for FilePond
    return res.status(200).send(uploadedFiles[0]);
}

async function CreateNewContribution(req, res, next) {
    const payloadSchema = {
        contributionId: Joi.string().required(),
        uploadedBy: Joi.string().required(),
        courseCode: Joi.string().required(),
        parentFolder: Joi.string().required(),
        approved: Joi.bool(),
        description: Joi.string().required(),
    };
    const data = req.body;
    data.courseCode = normalizeCourseCode(data.courseCode);

    const valid = validatePayload(payloadSchema, data);
    if (valid.error) {
        return next(new AppError(400, valid.error));
    }

    const newContribution = await ContributionCreation(data.contributionId, data);
    return res.json({
        created: true,
        data: newContribution,
    });
}

async function GetMyContributions(req, res, next) {
    const myContributions = await Contribution.find({ uploadedBy: req.user._id }).populate({
        path: "files",
    });
    res.json(myContributions);
}

async function DeleteContribution(req, res, next) {
    const { contributionId } = req.params;
    await Contribution.deleteOne({ contributionId });
    res.json({ deleted: true });
}

// date format : YYYY-MM-DD
async function GetContributionsUpdatedSince(req, res, next) {
    const { date } = req.body;
    if (!date) return next(new AppError(400, "Invalid date"));
    const d = new Date(date);
    const contributions = await Contribution.find({ updatedAt: { $gte: d } });
    let codeSet = new Set();
    contributions.map((c) => codeSet.add(normalizeCourseCode(c.courseCode)));
    let codes = [];
    codeSet.forEach((c) => codes.push(c));
    return res.json({ codes, contributions });
}

async function GetBrContribution(req, res, next) {
    try {
        const { courses } = req.body;

        if (!courses || !Array.isArray(courses)) {
            return res.status(400).json({ error: "courses array required" });
        }
        const codes = courses.map((course) => normalizeCourseCode(course.code)).filter(Boolean);
        const contributions = await Contribution.find({
            courseCode: { $in: codes.map(getCourseCodeCaseInsensitiveRegex) },
        }).populate({
            path: "files",
        });
        const unverifiedContributions = contributions.filter(c => c.files.some(f => f.isVerified === false));

        res.json({ unverifiedContributions });
    } catch (error) {
        next(error);
    }
}

async function viewFile(req, res, next) {
    try {
        const { id } = req.params;
        const file = await FileModel.findById(id);
        if (!file) {
            return res.status(404).json({ message: "File not found" });
        }
        if (file.isVerified === false && req.user.isBR === false) {
            return res.status(403).json({ message: "File is not verified" });
        }
        const getResponse = async () => {
            const accessToken = await getAccessToken();
            if (!accessToken) {
                return res.status(500).json({ message: "Access token not found" });
            }
            const response = await axios.get(`https://graph.microsoft.com/v1.0/me/drive/items/${file.fileId}/content`, {
                headers: {
                    Authorization: `Bearer ${accessToken}`
                },
                responseType: "stream"
            });

            res.setHeader("Content-Type", response.headers["content-type"])
            res.setHeader(
                "Content-Length",
                response.headers["content-length"]
            );

            const downloadStream = response.data;
            res.on("close", () => {
                downloadStream.destroy();
            });
            downloadStream.pipe(res);
        };
        try {
            await getResponse();
        } catch (err) {
            if (err.response?.status === 401) {
                clearAccessTokenCache();
                return await getResponse();
            }
            throw err;
        }
    } catch (error) {
        next(error);
    }
}

export default {
    GetAllContributions,
    CreateNewContribution,
    HandleFileUpload,
    GetMyContributions,
    DeleteContribution,
    GetContributionsUpdatedSince,
    GetBrContribution,
    viewFile
};
