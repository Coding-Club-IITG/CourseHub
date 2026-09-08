import isLibraryAuthenticated from "../../middleware/isLibraryAuthenticated.js";
import express from "express";
import {
    getAllFiles,
    verifyFile,
    unverifyFile,
    getFileLink,
    renameFile,
} from "./file.controller.js";
import { isBR } from "../../middleware/isBR.js";
import { downloadFiles } from "../../scripts/downloadFile.js";

const router = express.Router();
router.use(isLibraryAuthenticated);

router.get("/all", getAllFiles);
router.put("/verify/:id", isBR, verifyFile);
router.delete("/unverify/:id", isBR, unverifyFile);
router.post("/download", downloadFiles);
router.get("/link/:id", getFileLink);
router.put("/rename/:id", isBR, renameFile);

export default router;
