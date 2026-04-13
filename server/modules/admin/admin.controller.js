import AppError from "../../utils/appError.js";
import CourseModel, { FileModel, FolderModel } from "../course/course.model.js";
import Contribution from "../contribution/contribution.model.js";
import { getAllCourseIds, visitCourseById } from "../onedrive/onedrive.controller.js";
import SearchResults from "../search/search.model.js";
import Admin from "./admin.model.js";
import {
    createCourseStructure,
    getFolderIdByName,
    getFolderVisitLink,
    moveAllFolderFiles,
    moveFile,
} from "./admin.utils.js";
import fs from "fs";
import csv from "csv-parser";

async function createAdmin(req, res, next) {
    const { body } = req;
    const newAdmin = await Admin.create(body);
    return res.json(newAdmin);
}

async function getAdmin(req, res, next) {
    const admin = req.admin;
    if (!admin) return next(new AppError(500, "Something went wrong!"));
    return res.json({
        user: {
            userId: admin.userId,
        },
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
    let { code } = req.params;
    code = code.replaceAll(" ", "");
    const search = await SearchResults.findOne({ code: code.toLowerCase() });
    if (!search) return next(new AppError(400, "invalid course code"));
    await CourseModel.deleteOne({ code: code.toLowerCase() });
    await FolderModel.deleteMany({ course: code.toLowerCase() });
    await FileModel.deleteMany({ course: `${code.toLowerCase()} - ${search.name.toLowerCase()}` });
    await SearchResults.updateOne({ code: code.toLowerCase() }, { isAvailable: false });
    return res.json({ deleted: true });
}

async function makeCourseById(req, res, next) {
    let { body } = req;
    let { id, code } = body;
    code = code.replaceAll(" ", "");
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
    let { body } = req;
    let { contributionId, toFolderId, courseCode } = body;
    courseCode = courseCode.replaceAll(" ", "");
    const _fromFolderId = await getFolderIdByName(contributionId);

    const resp = await moveAllFolderFiles(_fromFolderId, toFolderId);
    // mark contribution approved
    const allCourses = await getAllCourseIds();

    const courseIdObj = allCourses.find(
        (course) => course.name.split("-")[0].trim().toLowerCase() === courseCode.toLowerCase()
    );
    const courseId = courseIdObj.id;
    const search = await SearchResults.findOne({ code: courseCode.toLowerCase() });
    if (search) {
        await CourseModel.deleteOne({ code: courseCode.toLowerCase() });
        await FolderModel.deleteMany({ course: courseCode.toLowerCase() });
        await FileModel.deleteMany({
            course: `${courseCode.toLowerCase()} - ${search.name.toLowerCase()}`,
        });
        await SearchResults.updateOne({ code: courseCode.toLowerCase() }, { isAvailable: false });
    }
    await visitCourseById(courseId);
    await Contribution.updateOne({ contributionId: contributionId }, { approved: true });
    return res.json({ approved: true });
}

async function getCourseFolder(req, res, next) {
    let { code } = req.params;
    code = code.replaceAll(" ", "");
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
async function getFolderLink(req, res, next) {
    const { folderName } = req.params;

    const visitLink = await getFolderVisitLink(folderName);
    return res.json({ link: visitLink });
}
async function getFolderId(req, res, next) {
    const { folderName } = req.params;

    const id = await getFolderIdByName(folderName);
    return res.json({ id: id });
}

async function createNewCourseFolders(req, res, next) {
    let courseCodeName = req.body.code;
    if (!courseCodeName) return next(new AppError(500, "code-name required"));
    const resp = await createCourseStructure(courseCodeName);
    return res.json({
        id: resp,
    });
}

async function markApproved(req, res, next) {
    let contri_id = req.body.id;
    if (!contri_id) return next(new AppError(400, "Invalid request"));
    const contribution = await Contribution.findOne({ contributionId: contri_id });
    if (!contribution) return next(new AppError(400, "Invalid Id"));
    contribution.approved = true;
    await contribution.save();
    return res.json("approved");
}

export default {
    createAdmin,
    getAdmin,
    getOnedriveCourses,
    getDBCourses,
    deleteCourseByCode,
    makeCourseById,
    getCourseFolder,
    uploadToFolder,
    getFolderLink,
    getFolderId,
    createNewCourseFolders,
    markApproved,
};
