import express from "express";
import { getAllFiles, verifyFile, unverifyFile, getFileLink, renameFile } from "./file.controller.js";
import isAuthenticated from "../../middleware/isAuthenticated.js";
import { isBR } from "../../middleware/isBR.js"; // if it's a named export
import { downloadFiles } from "../../scripts/downloadFile.js";

const router = express.Router();

router.get("/all", isAuthenticated, getAllFiles);
router.put("/verify/:id", isAuthenticated, isBR, verifyFile);
// router.delete("/unverify/:id", isAuthenticated, isBR, unverifyFile);
router.delete("/unverify/:id", unverifyFile);
// route to download file
router.post("/download", downloadFiles);
router.get("/link/:id", getFileLink);
router.put("/rename/:id", isAuthenticated, isBR, renameFile);

export default router;
