import Contribution from "./contribution.model.js";
import Joi from "joi";
import AppError from "../../utils/appError.js";
import validatePayload from "../../utils/validate.js";
import formidable from "formidable";
import UploadFile from "../../services/UploadFile.js";
import fs from "fs";
import { CLIENT_RENEG_LIMIT } from "tls";
import { logger } from "@azure/identity";

async function ContributionCreation(contributionId, data) {
    const existingContribution = await Contribution.findOne({ contributionId });
    console.log(existingContribution);
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

async function HandleFileToDB(contributionId, fileName) {
    const existingContribution = await Contribution.findOne({ contributionId });

    if (!existingContribution) {
        const newContribution = await Contribution.create({ contributionId, fileName });
        console.log("new contri");
        return newContribution;
    }
    existingContribution.fileName.push(fileName);
    await existingContribution.save();
    console.log("updated contri");
    return existingContribution;
}

async function GetAllContributions(req, res, next) {
    const allContributions = await Contribution.find({});
    res.json(allContributions);
}

async function HandleFileUpload(req, res, next) {
    const contributionId = req.headers["contribution-id"];
    console.log(req.headers.username);
    const form = formidable({ multiples: true });

    form.parse(req, async (err, fields, files) => {
        if (err) {
            next(err);
            return;
        }

        // Files names
        let initialPath = files.filepond.filepath;
        let newFilename = files.filepond.newFilename;
        let originalFilename = files.filepond.originalFilename;

        let wordArr = originalFilename.split(".");
        let fileExtension = wordArr[wordArr.length - 1];
        let finalFileName = "";

        for (let i = 0; i < wordArr.length - 1; i++) {
            finalFileName += wordArr[i];
        }
        finalFileName += "~" + req.headers.username;
        finalFileName += "." + fileExtension;

        const finalPath = initialPath.slice(0, initialPath.indexOf(newFilename));

        fs.rename(finalPath + newFilename, finalPath + finalFileName, async () => {
            await HandleFileToDB(contributionId, finalFileName);
            await UploadFile(contributionId, finalPath, finalFileName);
        });

        return res.json({ fields, files });
    });
}

async function CreateNewContribution(req, res, next) {
    const payloadSchema = {
        contributionId: Joi.string().required(),
        year: Joi.string().required(),
        uploadedBy: Joi.string().required(),
        courseCode: Joi.string().required(),
        folder: Joi.string().required(),
        approved: Joi.bool(),
        description: Joi.string().required(),
        // isAnonymous: Joi.boolean().required(),
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
    const myContributions = await Contribution.find({ uploadedBy: req.user._id });
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
        year: Joi.string().required(),
        uploadedBy: Joi.string().required(),
        courseCode: Joi.string().required(),
        folder: Joi.string().required(),
        approved: Joi.bool(),
        description: Joi.string().required(),
        // isAnonymous: Joi.boolean().required(),
    };
    const data = req.body;

    const valid = validatePayload(payloadSchema, data);
    if (valid.error) {
        return next(new AppError(400, valid.error));
    }

    const contributionId = data.contributionId;
    const files = req.files;
    let fileNames = [];
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

export default {
    GetAllContributions,
    CreateNewContribution,
    HandleFileUpload,
    GetMyContributions,
    MobileFileUploadHandler,
    DeleteContribution,
};
