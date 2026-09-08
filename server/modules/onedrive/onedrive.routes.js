import isLibraryAuthenticated from "../../middleware/isLibraryAuthenticated.js";
import express from "express";
import catchAsync from "../../utils/catchAsync.js";
import { thumbnail, getFilePreview, getFileDownload } from "./onedrive.controller.js";

const router = express.Router();
router.use(isLibraryAuthenticated);

router.post("/thumbnail", catchAsync(thumbnail));
router.get("/preview/:fileID", catchAsync(getFilePreview));
router.get("/download/:fileID", catchAsync(getFileDownload));

export default router;
