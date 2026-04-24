import AppError from "../../utils/appError.js";
import CourseModel, { FolderModel, FileModel } from "./course.model.js";
import logger from "../../utils/logger.js";
import SearchResults from "../search/search.model.js";
import courselist from "./course.list.js";
import { bootstrapCourseFolders } from "./course.service.js";
import { normalizeCourseCode, getCourseCodeCaseInsensitiveRegex } from "../../utils/course.js";

const COURSE_CHILDREN_POPULATE_DEPTH = 5;

const buildChildrenPopulate = (depth) => {
    if (depth <= 0) return undefined;

    const populate = {
        strictPopulate: false,
        path: "children",
        select: "-__v",
    };

    const nestedPopulate = buildChildrenPopulate(depth - 1);
    if (nestedPopulate) {
        populate.populate = nestedPopulate;
    }

    return populate;
};

const createCourse = async (code) => {
    const normalizedCode = normalizeCourseCode(code);
    const courseLookupKey = `${normalizedCode.slice(0, 2)} ${normalizedCode.slice(-3)}`;
    await CourseModel.create({
        code: normalizedCode,
        name: courselist[courseLookupKey] || "Name Unavailable",
        children: [],
        books: [],
    });

    // Bootstrap folders
    await bootstrapCourseFolders(normalizedCode);

    const createdCourse = await CourseModel.findOne({
        code: getCourseCodeCaseInsensitiveRegex(normalizedCode),
    })
        .populate(buildChildrenPopulate(COURSE_CHILDREN_POPULATE_DEPTH))
        .select("-__v");

    return createdCourse;
};

export const getCourse = async (req, res, next) => {
    const { code } = req.params;
    logger.info(`GET /course/${code}`);

    const normalizedCode = normalizeCourseCode(code);
    if (!normalizedCode) throw new AppError(400, "Missing Course Id");
    const courseCodeRegex = getCourseCodeCaseInsensitiveRegex(normalizedCode);

    let courseDoc = await CourseModel.findOne({ code: courseCodeRegex })
        .populate(buildChildrenPopulate(COURSE_CHILDREN_POPULATE_DEPTH))
        .select("-__v");

    if (!courseDoc) {
        courseDoc = await createCourse(normalizedCode);
    }
    if (!courseDoc) throw new AppError(500, "Failed to create course");

    // Convert to plain object to avoid issues with Mongoose internal state
    const courseObj = courseDoc.toObject();

    const sortYear = (a, b) => {
        if (a?.name > b?.name) return 1;
        else if (a?.name < b?.name) return -1;
        else return 1;
    }

    if (courseObj?.children && courseObj.children.length > 1) {
        courseObj.children.sort(sortYear);
    }

    return res.json({ found: true, ...courseObj });
};

export const deleteCourseByCode = async (req, res, next) => {
    const { code } = req.params;
    const normalizedCode = normalizeCourseCode(code);
    if (!normalizedCode) throw new AppError(400, "Missing Course Id");

    const courseCodeRegex = getCourseCodeCaseInsensitiveRegex(normalizedCode);
    const courseFolders = await FolderModel.find({ courses: courseCodeRegex });
    for (const folder of courseFolders) {
        if (folder.courses.length > 1) {
            await FolderModel.updateOne({ _id: folder._id }, { $pull: { courses: normalizedCode } });
        } else {
            await FolderModel.deleteOne({ _id: folder._id });
        }
    }
    await FileModel.deleteMany({
        course: { $regex: `^${normalizedCode}\\s-\\s`, $options: "i" },
    });
    await CourseModel.deleteOne({ code: courseCodeRegex });
    res.sendStatus(200);
};

export const getAllCourses = async (req, res, next) => {
    const allCourse = await CourseModel.find().select("_id name code");

    res.json(allCourse);
};

export const isCourseUpdated = async (req, res, next) => {
    let { clientOn } = req.body;
    if (!clientOn) return next(new AppError(500, "Invalid data provided!"));
    let outdatedOnClient = [];

    const courses = req.user.courses
        .map((c) => normalizeCourseCode(c.code))
        .filter(Boolean);
    const searchResults = await SearchResults.find({
        code: { $in: courses.map(getCourseCodeCaseInsensitiveRegex) },
    });
    const availableCourses = searchResults.filter((s) => s.isAvailable === true);
    const availableCourseCodes = [
        ...new Set(availableCourses.map((c) => normalizeCourseCode(c.code)).filter(Boolean)),
    ];
    const allOutdatedCourses = await CourseModel.find({
        $and: [
            { code: { $in: availableCourseCodes.map(getCourseCodeCaseInsensitiveRegex) } },
            { $or: [{ createdAt: { $gt: clientOn } }, { updatedAt: { $gt: clientOn } }] },
        ],
    });

    allOutdatedCourses.map((course) => {
        outdatedOnClient.push(course.code);
    });

    if (!allOutdatedCourses.length > 0) {
        return res.json({ updated: false, subscribedCourses: req.user.courses });
    }
    return res.json({
        updated: true,
        updatedCourses: outdatedOnClient,
        subscribedCourses: req.user.courses,
    });
};
