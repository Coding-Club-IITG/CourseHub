import express from "express";
const router = express.Router();
import ContributionController from "./contribution.controller.js";
import catchAsync from "../../utils/catchAsync.js";
import isAuthenticated from "../../middleware/isAuthenticated.js";
import multer from "multer";

export const upload = multer({ dest: "external/uploads" });
router.get("/", isAuthenticated, ContributionController.GetMyContributions);
router.get("/all", ContributionController.GetAllContributions);
router.delete("/:contributionId", ContributionController.DeleteContribution);
router.post("/", catchAsync(ContributionController.CreateNewContribution));
router.post("/upload", upload.array("file"), catchAsync(ContributionController.HandleFileUpload));
// router.get("/:id", catchAsync(ContributionController.CreateNewContribution));
router.post("/updated", catchAsync(ContributionController.GetContributionsUpdatedSince));
router.post("/br",isAuthenticated, ContributionController.GetBrContribution)

export default router;
