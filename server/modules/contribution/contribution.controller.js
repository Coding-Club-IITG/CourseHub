import Contribution from "./contribution.model.js";
import Joi from "joi";
import AppError from "../../utils/appError.js";
import validatePayload from "../../utils/validate.js";
import formidable from "formidable";
import UploadFile from "../../services/UploadFile.js";
import fs from "fs";
import { FolderModel } from "../course/course.model.js";
import { CLIENT_RENEG_LIMIT } from "tls";
import { logger } from "@azure/identity";

async function ContributionCreation(contributionId, data) {
    const existingContribution = await Contribution.findOne({ contributionId });
    if (!existingContribution) {
        const newContribution = await Contribution.create({ ...data, contributionId });
        // console.log("new contri");
        return newContribution;
    }
    const updatedContribution = await Contribution.findOneAndUpdate(
        { contributionId },
        { ...data },
        { new: true }
    );
    console.log("updated contri");
    return updatedContribution;
}

async function HandleFileToDB(contributionId, fileId) {
    const existingContribution = await Contribution.findOne({ contributionId });
    const parentFolder = await FolderModel.findOne({ _id: existingContribution.parentFolder });

    if (!existingContribution) {
        const newContribution = await Contribution.create({ contributionId, files: [fileId] });
        console.log("new contri");
        return newContribution;
    }
    existingContribution.files.push(fileId);
    parentFolder.children.push(fileId);
    await existingContribution.save();
    await parentFolder.save();
    console.log("updated contri");
    console.log(`Added file ${fileId} to contribution ${contributionId}`);
    return existingContribution;
}

async function GetAllContributions(req, res, next) {
    const allContributions = await Contribution.find({});
    res.json(allContributions);
}

async function HandleFileUpload(req, res, next) {
    console.log("Handling File Upload");
    const contributionId = req.headers["contribution-id"];
    const username = req.headers.username;
    const files = req.files; 

    if (!files || files.length === 0) {
        return res.status(400).json({ error: "No files were uploaded" });
    }

    const uploadedFiles = [];

    try {
        for (const file of files) {
            // Files names
            let initialPath = file.path;
            let newFilename = file.filename;
            let originalFilename = file.originalname;

            let wordArr = originalFilename.split(".");
            let fileExtension = wordArr[wordArr.length - 1];
            let finalFileName = "";

            for (let i = 0; i < wordArr.length - 1; i++) {
                finalFileName += wordArr[i];
            }
            finalFileName += "~" + username;
            finalFileName += "." + fileExtension;

            const finalPath = initialPath.slice(0, initialPath.indexOf(newFilename));

            await fs.promises.rename(finalPath + newFilename, finalPath + finalFileName);
            const fileId = await UploadFile(contributionId, finalPath, finalFileName);
            
            if (fileId) {
                await HandleFileToDB(contributionId, fileId);
                uploadedFiles.push({ 
                    fileId, 
                    originalName: originalFilename,
                    finalName: finalFileName 
                });
            }
            
            await fs.promises.unlink(finalPath + finalFileName);
        }

        console.log(`Successfully uploaded ${uploadedFiles.length} files`);
        return res.json({ 
            files: uploadedFiles, 
            count: uploadedFiles.length 
        });

    } catch (error) {
        console.error("File upload error:", error);
        return res.status(500).json({ 
            error: "File upload failed", 
            details: error.message 
        });
    }
}

async function CreateNewContribution(req, res, next) {
    const payloadSchema = {
        contributionId: Joi.string().required(),
        //year: Joi.string().required(),
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
    const deleted = await Contribution.deleteOne({ contributionId });
    console.log(deleted);
    res.json({ deleted: true });
}

async function MobileFileUploadHandler(req, res, next) {
    const payloadSchema = {
        contributionId: Joi.string().required(),
        //year: Joi.string().required(),
        uploadedBy: Joi.string().required(),
        courseCode: Joi.string().required(),
        parentFolder: Joi.string().required(),
        approved: Joi.bool(),
        description: Joi.string().required(),
        isAnonymous: Joi.boolean().required(),
    };
    const data = req.body;

    const valid = validatePayload(payloadSchema, data);
    if (valid.error) {
        return next(new AppError(400, valid.error));
    }

    const contributionId = data.contributionId;
    const files = req.files;
    let fileName = [];
    files.map((file) => {
        // Files names

        let initialPath = file.path;
        let newFilename = file.filename;
        let originalFilename = file.originalname;

        let wordArr = originalFilename.split(".");
        let fileExtension = wordArr[wordArr.length - 1];
        let finalFileName = "";

        for (let i = 0; i < wordArr.length - 1; i++) {
            finalFileName += wordArr[i];
        }
        finalFileName += "~" + req.user.name;
        finalFileName += "." + fileExtension;
        fileNames.push(finalFileName);

        const finalPath = initialPath.slice(0, initialPath.indexOf(newFilename));

        fs.rename(finalPath + newFilename, finalPath + finalFileName, async () => {
            // await HandleFileToDB(contributionId, finalFileName);
            await UploadFile(contributionId, finalPath, finalFileName);
        });
    });

    // const newContribution = await ContributionCreation(data.contributionId, data);
    const newContribution = await Contribution.create({
        ...data,
        fileName: [...fileNames],
    });
    return res.json({
        created: true,
        data: newContribution,
    });
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
    MobileFileUploadHandler,
    DeleteContribution,
    GetContributionsUpdatedSince,
    GetBrContribution
};
