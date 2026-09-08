import express from "express";
import catchAsync from "../../utils/catchAsync.js";
import isAdmin from "../../middleware/isAdmin.js";
import multer from "multer";
import { adminLogin, adminLogout, getAdmin } from "./auth.controller.js";
import {
    getDBCourses,
    uploadCourses,
    renameCourse,
    deleteCourse,
    linkLegacyCourse,
    bulkLinkCourses,
    syncCoursesCacheController,
    getCourseDashboardData,
    handleContribution,
    deleteNode,
} from "./adminDashboard.controller.js";

const router = express.Router();
const upload = multer({ dest: "uploads/" });

// Admin auth
router.post("/auth/login", catchAsync(adminLogin));
router.post("/auth/logout", catchAsync(adminLogout));

router.get("/course/:code/dashboard", isAdmin, catchAsync(getCourseDashboardData));
router.post("/contribution/action", isAdmin, catchAsync(handleContribution));
router.delete("/node/:type/:id", isAdmin, catchAsync(deleteNode));
router.get("/", isAdmin, catchAsync(getAdmin));
router.get("/dbcourses", isAdmin, catchAsync(getDBCourses));

router.post("/courses/upload", isAdmin, upload.single("file"), uploadCourses);
router.post("/courses/bulk-link", isAdmin, upload.single("file"), bulkLinkCourses);
router.patch("/course/:code", isAdmin, renameCourse);
router.post("/course/:code/link", isAdmin, linkLegacyCourse);
router.delete("/course/:code/delete", isAdmin, catchAsync(deleteCourse));
router.post("/sync-courses-cache", isAdmin, catchAsync(syncCoursesCacheController));

export default router;
