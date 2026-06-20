import express from "express";
import catchAsync from "../../utils/catchAsync.js";
import adminController from "./admin.controller.js";
import AppError from "../../utils/appError.js";
import isAdmin from "../../middleware/isAdmin.js";
import multer from "multer";
import { adminLogin, adminLogout } from "./auth.controller.js";
import { uploadCourses, renameCourse, deleteCourse, linkLegacyCourse, bulkLinkCourses, syncCoursesCacheController } from "./adminDashboard.controller.js";
import {getCourseDashboardData, handleContribution} from "./adminDashboard.controller.js"

const router = express.Router();
const upload = multer({ dest: "uploads/" });

// Admin auth
router.post("/auth/login", catchAsync(adminLogin));
router.post("/auth/logout", catchAsync(adminLogout));

router.post(
    "/",
    function (req, res, next) {
        if (req.headers.authorization === "ankit99") {
            return next();
        }
        return next(new AppError(403, "Not Authorized"));
    },
    catchAsync(adminController.createAdmin)
);

router.get("/course/:code/dashboard", getCourseDashboardData);
router.post("/contribution/action", handleContribution);
router.delete("/node/:type/:id", deleteNode);
router.get("/", isAdmin, catchAsync(adminController.getAdmin));
router.get("/onedrivecourses", isAdmin, catchAsync(adminController.getOnedriveCourses));
router.get("/dbcourses", isAdmin, catchAsync(adminController.getDBCourses));
router.delete("/course/:code", isAdmin, catchAsync(adminController.deleteCourseByCode));
router.post("/course", isAdmin, catchAsync(adminController.makeCourseById));
router.get("/course/:code", isAdmin, catchAsync(adminController.getCourseFolder));
router.post("/contribution/approve", isAdmin, catchAsync(adminController.uploadToFolder));
router.get("/contribution/visit/:folderName", isAdmin, catchAsync(adminController.getFolderLink));
router.get("/contribution/id/:folderName", isAdmin, catchAsync(adminController.getFolderId));
router.post("/contribution/markapproved", isAdmin, catchAsync(adminController.markApproved));
router.post(
    "/contribution/bootstrapnewcourse",
    isAdmin,
    catchAsync(adminController.createNewCourseFolders)
);

router.post("/courses/upload", isAdmin, upload.single("file"), uploadCourses);
router.post("/courses/bulk-link", isAdmin, upload.single("file"), bulkLinkCourses);
router.patch("/course/:code", isAdmin, renameCourse);
router.post("/course/:code/link", isAdmin, linkLegacyCourse);
router.delete("/course/:code/delete", isAdmin, catchAsync(deleteCourse));
router.post("/sync-courses-cache", isAdmin, catchAsync(syncCoursesCacheController));

export default router;
