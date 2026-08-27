import express from "express";
import catchAsync from "../../utils/catchAsync.js";
import {
    makeAllCourses,
    makeCourseById,
    getCourseIds,
    thumbnail,
    getFile,
    getFilePreview,
    getFileDownload,
} from "./onedrive.controller.js";

const router = express.Router();

router.get("/makeAllCourses", catchAsync(makeAllCourses));
router.get("/makeCourseById/:id", catchAsync(makeCourseById));
router.get("/getCourseIds", catchAsync(getCourseIds));
router.post("/thumbnail", catchAsync(thumbnail));
router.get("/:id", catchAsync(getFile));
router.get("/preview/:fileID", catchAsync(getFilePreview));
router.get("/download/:fileID", catchAsync(getFileDownload));

export default router;
