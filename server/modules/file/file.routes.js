import isLibraryAuthenticated from "../../middleware/isLibraryAuthenticated.js";
import express from "express";
import {
    getAllFiles,
    verifyFile,
    unverifyFile,
    getFileLink,
    renameFile,
    downloadFiles,
} from "./file.controller.js";
import { isBR } from "../../middleware/isBR.js";
import catchAsync from "../../utils/catchAsync.js";
import { fileContent, fileThumbnail, filePreview } from "../../services/fileDelivery.js";

const router = express.Router();
router.use(isLibraryAuthenticated);

router.get("/all", catchAsync(getAllFiles));
router.put("/verify/:id", isBR, catchAsync(verifyFile));
router.delete("/unverify/:id", isBR, catchAsync(unverifyFile));
router.post("/download", catchAsync(downloadFiles));
router.get("/link/:id", catchAsync(getFileLink));
router.put("/rename/:id", isBR, catchAsync(renameFile));

router.get("/content/:id", catchAsync(fileContent));
router.get("/preview/:id", catchAsync(filePreview));
router.get("/thumbnail/:id", catchAsync(fileThumbnail));
export default router;
