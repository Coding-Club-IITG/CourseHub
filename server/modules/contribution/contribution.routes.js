import isLibraryAuthenticated from "../../middleware/isLibraryAuthenticated.js";
import express from "express";
const router = express.Router();
router.use(isLibraryAuthenticated);
import ContributionController from "./contribution.controller.js";
import catchAsync from "../../utils/catchAsync.js";
import isAuthenticated from "../../middleware/isAuthenticated.js";
import { isBR } from "../../middleware/isBR.js";
import multer from "multer";
import { multipartLimits, parseMultipart } from "../../middleware/multipart.js";
import { authorizeContributionUpload } from "../../services/authorization.js";

export const upload = multer({ dest: "external/uploads", limits: multipartLimits });
router.get("/", isAuthenticated, catchAsync(ContributionController.GetMyContributions));
router.post("/", catchAsync(ContributionController.CreateNewContribution));
router.post(
    "/upload",
    authorizeContributionUpload,
    parseMultipart(upload.array("file")),
    catchAsync(ContributionController.HandleFileUpload),
);
router.post("/br", isBR, catchAsync(ContributionController.GetBrContribution));
export default router;
