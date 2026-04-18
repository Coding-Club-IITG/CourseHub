import Contribution from "./contribution.model.js";
import Joi from "joi";
import AppError from "../../utils/appError.js";
import validatePayload from "../../utils/validate.js";
import UploadFile from "../../services/UploadFile.js";
import fs from "fs";
import { FolderModel } from "../course/course.model.js";
import logger from "../../utils/logger.js";

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

    const parentFolder = await FolderModel.findOne({ _id: existingContribution.parentFolder });

    existingContribution.files.push(fileId);
    if (parentFolder) {
        parentFolder.children.push(fileId);
        await parentFolder.save();
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
    const files = req.files;

    if (!files || files.length === 0) {
        return res.status(400).json({ error: "No files were uploaded" });
    }

    const uploadedFiles = [];

    for (const file of files) {
        let initialPath = file.path;
        let newFilename = file.filename;
        let originalFilename = file.originalname;

        let wordArr = originalFilename.split(".");
        let fileExtension = wordArr[wordArr.length - 1];
        let finalFileName = "";

        for (let i = 0; i < wordArr.length - 1; i++) {
            finalFileName += wordArr[i];
        }
        finalFileName += "~" + req.headers.username;
        finalFileName += "." + fileExtension;

        const finalPath = initialPath.slice(0, initialPath.indexOf(newFilename));

        await fs.promises.rename(finalPath + newFilename, finalPath + finalFileName);
        const fileId = await UploadFile(contributionId, finalPath, finalFileName);
        if (fileId) {
            await HandleFileToDB(contributionId, fileId);
            uploadedFiles.push({ fileId, originalName: originalFilename });
        }
        await fs.promises.unlink(finalPath + finalFileName);
    }

    return res.json({ files: uploadedFiles, count: uploadedFiles.length });
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
    contributions.map((c) => codeSet.add(c.courseCode.toUpperCase()));
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
        const codes = courses.map((course) => course.code);
        const contributions = await Contribution.find({
            courseCode: { $in: codes }
        }).populate({
            path: "files",
        });
        const unverifiedContributions = contributions.filter(c => c.files.some(f => f.isVerified === false));

        res.json({ unverifiedContributions });
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
    GetBrContribution
};
