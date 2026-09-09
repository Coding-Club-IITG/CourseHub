import { uploadLimits } from "../../config/storage.js";
import isLibraryAuthenticated from "../../middleware/isLibraryAuthenticated.js";
import express from "express";
const router = express.Router();
router.use(isLibraryAuthenticated);
import ContributionController from "./contribution.controller.js";

import isAuthenticated from "../../middleware/isAuthenticated.js";
import { isBR } from "../../middleware/isBR.js";
import { receiveUpload } from "../../middleware/receiveUpload.js";

router.get("/limits", (req, res) => res.json(uploadLimits));
router.get("/", isAuthenticated, ContributionController.GetMyContributions);
router.post("/", ContributionController.CreateNewContribution);
router.post("/upload", receiveUpload);
router.post("/br", isBR, ContributionController.GetBrContribution);
export default router;
