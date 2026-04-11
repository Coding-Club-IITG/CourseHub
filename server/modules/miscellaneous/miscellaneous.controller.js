import { FunFacts, FeedbackBug } from "./miscellaneous.model.js";
import express from "express";
import { dirname } from "path";
import { fileURLToPath } from "url";
import ImageKit from "imagekit";
import links from "../../links.js";
import logger from "../../utils/logger.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const imagekit = new ImageKit({
    publicKey: "public_+YBUNGRmvTaKsBnbm1ivFykJGy0=",
    privateKey: "private_3uXXYBIXEeahWB5iO818Z6SYguQ=",
    urlEndpoint: "https://ik.imagekit.io/4d3jgzelm",
});

async function GetFunFacts(_, res) {
    if ((await FunFacts.findOne()) == null) {
        let data = await FunFacts.create({
            funFacts: ["CourseHub is Awesome!"],
        });
    }

    const { funFacts } = await FunFacts.findOne();
    return res.json({
        data: funFacts,
    });
}

async function GetPrivacyPolicy(req, res) {
    res.sendFile("./privacy-policy/privacy-policy.html", { root: __dirname });
}

async function PostFeedBack(req, res) {
    // category (FEEDBACK, BUG), description necessary, screenshots
    const photos = req.files;
    req.body.rollNumber = req.user.rollNumber;
    req.body.name = req.user.name;

    try {
        const screenshots = [];

        for (const photo of photos) {
            logger.info(photo);
            const image = await imagekit.upload({
                file: photo.buffer,
                fileName: photo.originalname,
            });

            screenshots.push(image.url);
        }

        req.body.screenshots = screenshots;

        let data = await FeedbackBug.create(req.body);
        res.json({
            success: true,
            message: data,
        });
    } catch (error) {
        logger.error(error);
        res.status(500).json({ success: false, message: error.message });
    }
}
// SDK initialization

export default { GetFunFacts, GetPrivacyPolicy, PostFeedBack };
