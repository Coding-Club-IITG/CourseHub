import express from "express";

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
router.post("/auth/login", requireTrustedOrigin, authThrottle("admin-login"), adminLogin);
router.post("/auth/logout", isAdmin, adminLogout);
router.use(isAdmin);

router.get("/course/:code/dashboard", getCourseDashboardData);
router.post("/contribution/action", handleContribution);
router.delete("/node/:type/:id", deleteNode);
router.get("/", getAdmin);
router.get("/dbcourses", getDBCourses);

router.post("/courses/upload", parseMultipart(upload.single("file")), uploadCourses);
router.post("/courses/bulk-link", parseMultipart(upload.single("file")), bulkLinkCourses);
router.patch("/course/:code", renameCourse);
router.post("/course/:code/link", linkLegacyCourse);
router.delete("/course/:code/delete", deleteCourse);
router.post("/sync-courses-cache", syncCoursesCacheController);

export default router;
