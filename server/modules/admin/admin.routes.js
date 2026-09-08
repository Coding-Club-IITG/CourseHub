import express from "express";
import catchAsync from "../../utils/catchAsync.js";
import isAdmin from "../../middleware/isAdmin.js";
import multer from "multer";
import { multipartLimits, parseMultipart } from "../../middleware/multipart.js";
import { requireTrustedOrigin } from "../../middleware/csrf.js";
import { authThrottle } from "../../middleware/authThrottle.js";
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
const upload = multer({ dest: "uploads/", limits: multipartLimits });

// Admin auth
router.post(
    "/auth/login",
    requireTrustedOrigin,
    authThrottle("admin-login"),
    catchAsync(adminLogin),
);
router.post("/auth/logout", isAdmin, catchAsync(adminLogout));
router.use(isAdmin);

router.get("/course/:code/dashboard", catchAsync(getCourseDashboardData));
router.post("/contribution/action", catchAsync(handleContribution));
router.delete("/node/:type/:id", catchAsync(deleteNode));
router.get("/", catchAsync(getAdmin));
router.get("/dbcourses", catchAsync(getDBCourses));

router.post("/courses/upload", parseMultipart(upload.single("file")), catchAsync(uploadCourses));
router.post(
    "/courses/bulk-link",
    parseMultipart(upload.single("file")),
    catchAsync(bulkLinkCourses),
);
router.patch("/course/:code", catchAsync(renameCourse));
router.post("/course/:code/link", catchAsync(linkLegacyCourse));
router.delete("/course/:code/delete", catchAsync(deleteCourse));
router.post("/sync-courses-cache", catchAsync(syncCoursesCacheController));

export default router;
