import isLibraryAuthenticated from "../../middleware/isLibraryAuthenticated.js";
import express from "express";
import { createFolder, deleteFolder, getFolderContent, renameFolder } from "./folder.controller.js";
import { isBR } from "../../middleware/isBR.js"; // if it's a named export

import catchAsync from "../../utils/catchAsync.js";
const router = express.Router();
router.use(isLibraryAuthenticated);

router.post("/create", isBR, catchAsync(createFolder));
router.delete("/delete", isBR, catchAsync(deleteFolder));
router.get("/content/:folderId", catchAsync(getFolderContent));
router.post("/rename", isBR, catchAsync(renameFolder));

export default router;
