import AppError from "../../utils/appError.js";
import {
    signAdminJWT,
    tryAuthenticate,
    verifyOTP,
    generateOTP,
} from "../auth-admin/auth-admin.services.js";
import CourseModel, { FileModel, FolderModel } from "../course/course.model.js";
import { getAllCourseIds, visitCourseById } from "../onedrive/onedrive.routes.js";
import SearchResults from "../search/search.model.js";
import Admin, {
    adminValidationSchema,
    approveContributionSchema,
    generateCodeValidaitionSchema,
    loginValidationSchema,
    makeCourseValidationSchema,
} from "./admin.model.js";
import { moveFile } from "./admin.utils.js";

async function createAdmin(req, res, next) {
    const { body } = req;
    try {
        await adminValidationSchema.validateAsync(body);
    } catch (error) {
        return next(new AppError(400, error.details));
    }

    const newAdmin = await Admin.create(body);

    return res.json(newAdmin);
}

async function getAdmin(req, res, next) {
    const token = req.user;
    const admin = await Admin.findById(token);
    if (!admin) return next(new AppError(500, "Something went wrong!"));
    return res.json({
        user: {
            username: admin.username,
            email: admin.email,
        },
    });
}

async function generateOTPHandler(req, res, next) {
    const { body } = req;
    try {
        await generateCodeValidaitionSchema.validateAsync(body);
    } catch (error) {
        return next(new AppError(400, error.details));
    }
    const user = await Admin.findOne({ username: body.username });
    if (!user) return next(new AppError(403, "Invalid Username or Password!"));
    const match = await tryAuthenticate(body.password, user.password);
    if (!match) return next(new AppError(403, "Invalid Username or Password!"));
    await generateOTP(user.username, user.email);
    return res.json({
        otpGenerated: true,
    });
}

async function login(req, res, next) {
    const { body } = req;
    try {
        await loginValidationSchema.validateAsync(body);
    } catch (error) {
        return next(new AppError(400, error.details));
    }
    const user = await Admin.findOne({ username: body.username });
    if (!user) return next(new AppError(403, "Invalid OTP!"));
    const match = await verifyOTP(user.email, body.otp);
    if (!match) return next(new AppError(403, "Invalid OTP!"));
    const token = await signAdminJWT(user._id.toString());
    return res.json({
        loginSuccessful: true,
        token: token,
    });
}

async function getOnedriveCourses(req, res, next) {
    const allCourses = await getAllCourseIds();
    res.json(allCourses);
}

async function getDBCourses(req, res, next) {
    const dbCourses = await CourseModel.find({});
    return res.json(dbCourses);
}

async function deleteCourseByCode(req, res, next) {
    const { code } = req.params;
    const search = await SearchResults.findOne({ code: code.toLowerCase() });
    if (!search) return next(new AppError(400, "invalid course code"));
    await CourseModel.deleteOne({ code: code.toLowerCase() });
    await FolderModel.deleteMany({ course: code.toLowerCase() });
    await FileModel.deleteMany({ course: `${code.toLowerCase()} - ${search.name.toLowerCase()}` });
    await SearchResults.updateOne({ code: code.toLowerCase() }, { isAvailable: false });
    return res.json({ deleted: true });
}

async function makeCourseById(req, res, next) {
    const { body } = req;
    try {
        await makeCourseValidationSchema.validateAsync(body);
    } catch (error) {
        return next(new AppError(400, error.details));
    }
    const { id, code } = body;
    const search = await SearchResults.findOne({ code: code.toLowerCase() });
    if (search) {
        await CourseModel.deleteOne({ code: code.toLowerCase() });
        await FolderModel.deleteMany({ course: code.toLowerCase() });
        await FileModel.deleteMany({
            course: `${code.toLowerCase()} - ${search.name.toLowerCase()}`,
        });
        await SearchResults.updateOne({ code: code }, { isAvailable: false });
    }
    await visitCourseById(id);
    return res.json({ created: true });
}

async function uploadToFolder(req, res, next) {
    const { body } = req;
    try {
        await approveContributionSchema.validateAsync(body);
    } catch (error) {
        return next(new AppError(400, error.details));
    }
    const { contributionId, fileId, folderId, name } = body;
    const resp = await moveFile(fileId, folderId, name);
    return res.json(resp);
}

async function getCourseFolder(req, res, next) {
    const { code } = req.params;
    const existingCourse = await CourseModel.findOne({ code: code.toLowerCase() })
        .populate({
            path: "children",
            select: "-__v",
            populate: {
                path: "children",
                select: "-__v",
                populate: {
                    strictPopulate: false,
                    path: "children",
                    select: "-__v",
                    populate: {
                        strictPopulate: false,
                        path: "children",
                        select: "-__v",
                        populate: {
                            strictPopulate: false,
                            path: "children",
                            select: "-__v",
                            populate: {
                                strictPopulate: false,
                                path: "children",
                                select: "-__v",
                                populate: {
                                    strictPopulate: false,
                                    path: "children",
                                    select: "-__v",
                                    populate: {
                                        strictPopulate: false,
                                        path: "children",
                                        select: "-__v",
                                    },
                                },
                            },
                        },
                    },
                },
            },
        })
        .select("-__v");
    console.log(existingCourse);
    if (!existingCourse) return next(new AppError(404, "Course not found"));
    return res.json(existingCourse);
}

export default {
    createAdmin,
    getAdmin,
    generateOTPHandler,
    login,
    getOnedriveCourses,
    getDBCourses,
    deleteCourseByCode,
    makeCourseById,
    getCourseFolder,
    uploadToFolder,
};
