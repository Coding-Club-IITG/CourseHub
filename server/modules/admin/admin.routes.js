import express from "express";
import catchAsync from "../../utils/catchAsync.js";
import adminController from "./admin.controller.js";
import AppError from "../../utils/appError.js";
import isAdmin from "../../middleware/isAdmin.js";

const router = express.Router();

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

router.post("/otp", catchAsync(adminController.generateOTPHandler));
router.post("/login", catchAsync(adminController.login));

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

export default router;
