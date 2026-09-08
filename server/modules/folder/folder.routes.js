import isLibraryAuthenticated from "../../middleware/isLibraryAuthenticated.js";
import express from "express";
import { createFolder, deleteFolder, getFolderContent, renameFolder } from "./folder.controller.js";
import { isBR } from "../../middleware/isBR.js"; // if it's a named export

const router = express.Router();
router.use(isLibraryAuthenticated);

router.post("/create", isBR, createFolder);
router.delete("/delete", isBR, deleteFolder);
router.get("/content/:folderId", getFolderContent);
router.post("/rename", isBR, renameFolder);

export default router;
