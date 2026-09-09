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

import { fileContent, fileThumbnail, filePreview } from "../../services/fileDelivery.js";

const router = express.Router();
router.use(isLibraryAuthenticated);

router.get("/all", getAllFiles);
router.put("/verify/:id", isBR, verifyFile);
router.delete("/unverify/:id", isBR, unverifyFile);
router.post("/download", downloadFiles);
router.get("/link/:id", getFileLink);
router.put("/rename/:id", isBR, renameFile);

router.get("/content/:id", fileContent);
router.get("/preview/:id", filePreview);
router.get("/thumbnail/:id", fileThumbnail);
export default router;
