import AppError from "../../utils/appError.js";
import CourseModel, { FolderModel, FileModel } from "./course.model.js";
import logger from "../../utils/logger.js";
import SearchResults from "../search/search.model.js";
export const getCourse = async (req, res, next) => {
    const { code } = req.params;
    logger.info(`GET /course/${code}`);

    if (!code) throw new AppError(400, "Missing Course Id");
    const course = await CourseModel.findOne({ code: code.toLowerCase() })
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

    // if (!course) throw new AppError(404, "Coming Soon!");
    if (!course) return res.json({ found: false });
    return res.json({ found: true, ...course["_doc"] });
};

export const deleteCourseByCode = async (req, res, next) => {
    const { code } = req.params;
    if (!code) throw new AppError(400, "Missing Course Id");
    const search = await SearchResults.findOne({ code: code.toLowerCase() });
    await FolderModel.deleteMany({ course: code.toLowerCase() });
    await FileModel.deleteMany({
        course: `${code.toLowerCase()} - ${search.name.toLowerCase()}`,
    });
    await CourseModel.deleteOne({ code: code.toLowerCase() });
    await SearchResults.findOneAndUpdate({code: code.toLowerCase()}, {isAvailable: false});
    res.sendStatus(200);
};

// update course
// delete existing course -> fetch new structure from onedrive

export const getAllCourses = async (req, res, next) => {
    const allCourse = await CourseModel.find().select("_id name code");

    res.json(allCourse);
};
