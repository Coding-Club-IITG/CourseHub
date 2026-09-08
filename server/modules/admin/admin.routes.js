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
router.use(isAdmin);

router.get("/course/:code/dashboard", catchAsync(getCourseDashboardData));
router.post("/contribution/action", catchAsync(handleContribution));
router.delete("/node/:type/:id", catchAsync(deleteNode));
router.get("/", catchAsync(getAdmin));
router.get("/dbcourses", catchAsync(getDBCourses));

router.post("/courses/upload", upload.single("file"), uploadCourses);
router.post("/courses/bulk-link", upload.single("file"), bulkLinkCourses);
router.patch("/course/:code", renameCourse);
router.post("/course/:code/link", linkLegacyCourse);
router.delete("/course/:code/delete", catchAsync(deleteCourse));
router.post("/sync-courses-cache", catchAsync(syncCoursesCacheController));

export default router;
