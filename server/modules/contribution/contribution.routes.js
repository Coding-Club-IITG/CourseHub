import isLibraryAuthenticated from "../../middleware/isLibraryAuthenticated.js";
import express from "express";
const router = express.Router();
router.use(isLibraryAuthenticated);
import ContributionController from "./contribution.controller.js";
import catchAsync from "../../utils/catchAsync.js";
import isAuthenticated from "../../middleware/isAuthenticated.js";
import { isBR } from "../../middleware/isBR.js";
import multer from "multer";

export const upload = multer({ dest: "external/uploads" });
router.get("/", isAuthenticated, catchAsync(ContributionController.GetMyContributions));
router.post("/", isAuthenticated, catchAsync(ContributionController.CreateNewContribution));
router.post(
    "/upload",
    isAuthenticated,
    upload.array("file"),
    catchAsync(ContributionController.HandleFileUpload),
);
router.post("/br", isBR, catchAsync(ContributionController.GetBrContribution));
router.get("/view/:id", catchAsync(ContributionController.viewFile));
export default router;
