import AppError from "../../utils/appError.js";
import CourseModel from "./course.model.js";
import logger from "../../utils/logger.js";
import { normalizeCourseCode, getCourseCodeCaseInsensitiveRegex } from "../../utils/course.js";
import { computePopulatedFolderSubtreeCount } from "../../utils/folder.js";

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

export const getCourse = async (req, res, next) => {
    const { code } = req.params;
    logger.info("Course requested");

    const normalizedCode = normalizeCourseCode(code);
    if (!normalizedCode) throw new AppError(400, "Missing Course Id");
    const courseCodeRegex = getCourseCodeCaseInsensitiveRegex(normalizedCode);

    const courseDoc = await CourseModel.findOne({ code: courseCodeRegex })
        .populate(buildChildrenPopulate(COURSE_CHILDREN_POPULATE_DEPTH))
        .select("-__v");

    if (!courseDoc) throw new AppError(404, "Course not found");

    // Convert to plain object to avoid issues with Mongoose internal state
    const courseObj = courseDoc.toObject();

    const sortYear = (a, b) => {
        if (a?.name > b?.name) return 1;
        else if (a?.name < b?.name) return -1;
        else return 1;
    };

    if (courseObj?.children && courseObj.children.length > 0) {
        for (const childFolder of courseObj.children) {
            computePopulatedFolderSubtreeCount(childFolder, normalizedCode);
        }
        if (courseObj.children.length > 1) {
            courseObj.children.sort(sortYear);
        }
    }

    logger.metric?.("course_opened", {
        value: 1,
        dimensions: {
            courseCode: courseObj.code,
            userEmail: req.user?.email || req.admin?.userId,
            department: req.user ? req.user.department : "unknown",
            semester: req.user ? req.user.semester : 0,
        },
    });

    return res.json({ found: true, ...courseObj });
};

export const getAllCourses = async (req, res, next) => {
    const allCourse = await CourseModel.find().select("_id name code");

    res.json(allCourse);
};
