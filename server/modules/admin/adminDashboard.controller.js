import {
    presentCourse,
    requireFile,
    requireFolder,
    requireCourse,
    courseContext,
    libraryGraph,
} from "../../services/authorization.js";
import { scheduleCourseLink } from "../../services/courseLinking.js";
import { scheduleDeletion } from "../../services/deletions.js";
import { mutateContent } from "../../services/contentMutation.js";
import { presentContribution } from "../contribution/contribution.controller.js";
import AppError from "../../utils/appError.js";
import CourseModel, { FileModel, FolderModel } from "../course/course.model.js";
import { processUploadedCsv } from "../../utils/uploadedCsv.js";
import { safeError } from "../../middleware/requestErrors.js";
import User from "../user/user.model.js";
import UserUpdate from "../user/userUpdate.model.js";
import Contribution from "../contribution/contribution.model.js";
import { normalizeCourseCode, getCourseCodeCaseInsensitiveRegex } from "../../utils/course.js";
import { runSync } from "../../scripts/syncCoursesCache.js";

// Get all courses from DB
export async function getDBCourses(req, res, next) {
    try {
        const dbCourses = await CourseModel.find({});
        return res.json(dbCourses);
    } catch (err) {
        return next(new AppError(500, "Failed to fetch courses"));
    }
}

// Upload courses via CSV file (comma-separated)
export async function uploadCourses(req, res) {
    const allCourses = await processUploadedCsv(req.file, ["code", "name"], async (results) => {
        for (const { code, name } of results) {
            if (!code || !name) continue;
            const codeUpper = normalizeCourseCode(code);
            await mutateContent(req, [codeUpper], async () => {
                const course = await CourseModel.findOne({
                    code: getCourseCodeCaseInsensitiveRegex(codeUpper),
                });
                if (!course) await CourseModel.create({ code: codeUpper, name });
                else {
                    course.code = codeUpper;
                    course.name = name;
                    await course.save();
                }
            });
        }
        return CourseModel.find({});
    });
    res.json(allCourses);
}

export async function getCourseDashboardData(req, res) {
    const course = await presentCourse(req, req.params.code);
    const codeRegex = getCourseCodeCaseInsensitiveRegex(course.code);
    const studentCount = await User.countDocuments({ "courses.code": codeRegex });
    const graph = await libraryGraph(req);
    const folderIds = [...graph.folderCourses]
        .filter(([, codes]) => codes.has(normalizeCourseCode(course.code)))
        .map(([id]) => id);
    const records = await Contribution.find({ parentFolder: { $in: folderIds } })
        .sort({ createdAt: -1 })
        .populate("files");
    const contributions = await Promise.all(
        records.map((c) => presentContribution(req, c, normalizeCourseCode(course.code))),
    );
    res.json({ course, studentCount, contributions });
}
export async function deleteNode(req, res) {
    if (!["file", "folder"].includes(req.params.type)) throw new AppError(400, "Invalid node type");
    res.status(202).json(
        await scheduleDeletion(req, {
            kind: req.params.type,
            id: req.params.id,
            code: req.body.courseCode,
        }),
    );
}
async function approveContribution(req, res) {
    const { contributionId, action } = req.body;
    if (typeof contributionId !== "string" || !["approve", "reject"].includes(action))
        throw new AppError(400, "Invalid contribution action");
    const code = courseContext(req.body.courseCode);
    const contribution = await Contribution.findOne({ contributionId }).populate("files");
    if (!contribution) throw new AppError(404, "Contribution not found");
    await requireFolder(req, String(contribution.parentFolder), code, "canModerate");
    // Validate the entire stored manifest before the first side effect.
    for (const file of contribution.files)
        await requireFile(req, String(file._id), code, "canModerate");
    await FileModel.updateMany(
        { _id: { $in: contribution.files.map((file) => file._id) } },
        { $set: { isVerified: true } },
    );
    contribution.approved = true;
    await contribution.save();
    res.json({ success: true });
}

export async function handleContribution(req, res) {
    if (
        typeof req.body.contributionId !== "string" ||
        !["approve", "reject"].includes(req.body.action)
    )
        throw new AppError(400, "Invalid contribution action");
    const code = courseContext(req.body.courseCode);
    if (req.body.action === "reject")
        return res.status(202).json(
            await scheduleDeletion(req, {
                kind: "contribution",
                id: req.body.contributionId,
                code,
            }),
        );
    return mutateContent(req, [code], () => approveContribution(req, res));
}

async function renameCourseAction(req, res, next) {
    const { code } = req.params;
    const { name, newCode } = req.body;

    if (!name) {
        return next(new AppError(400, "Name required"));
    }

    const codeUpper = normalizeCourseCode(code);
    if (!codeUpper) {
        return next(new AppError(400, "Course code required"));
    }
    const codeRegex = getCourseCodeCaseInsensitiveRegex(codeUpper);

    // If a newCode is provided, check for conflicts (case-insensitive, trimmed)
    if (newCode) {
        const newCodeUpper = normalizeCourseCode(newCode);
        // If the new code is different from the current code, ensure it doesn't already exist
        if (newCodeUpper !== codeUpper) {
            const conflict = await CourseModel.findOne({
                code: getCourseCodeCaseInsensitiveRegex(newCodeUpper),
            });
            if (conflict) {
                return next(new AppError(400, "Course code already exists"));
            }

            // 1. Update all folders with the old code to use the new code
            const foldersToUpdate = await FolderModel.find({ courses: codeRegex });
            const folderUpdateResult = await FolderModel.updateMany(
                { courses: codeRegex },
                { $set: { "courses.$": newCodeUpper } },
            );

            // 2. Update all users' courses that have the old course code
            const usersWithCourses = await User.find({
                "courses.code": { $regex: `^${codeUpper}$`, $options: "i" },
            });
            const courseUpdateResult = await User.updateMany(
                { "courses.code": { $regex: `^${codeUpper}$`, $options: "i" } },
                { $set: { "courses.$.code": newCodeUpper } },
            );

            const usersWithPreviousCourses = await User.find({
                "previousCourses.code": { $regex: `^${codeUpper}$`, $options: "i" },
            });
            const previousCourseUpdateResult = await User.updateMany(
                { "previousCourses.code": { $regex: `^${codeUpper}$`, $options: "i" } },
                { $set: { "previousCourses.$.code": newCodeUpper } },
            );

            const usersWithReadOnly = await User.find({
                "readOnly.code": { $regex: `^${codeUpper}$`, $options: "i" },
            });
            const readOnlyUpdateResult = await User.updateMany(
                { "readOnly.code": { $regex: `^${codeUpper}$`, $options: "i" } },
                { $set: { "readOnly.$.code": newCodeUpper } },
            );

            // 3. Update all contributions with the old course code
            const contributionsToUpdate = await Contribution.find({
                courseCode: getCourseCodeCaseInsensitiveRegex(codeUpper),
            });
            const contributionUpdateResult = await Contribution.updateMany(
                { courseCode: getCourseCodeCaseInsensitiveRegex(codeUpper) },
                { courseCode: newCodeUpper },
            );
        }
    }

    const course = await CourseModel.findOneAndUpdate(
        { code: codeRegex },
        { name, code: newCode ? normalizeCourseCode(newCode) : codeUpper },
        { new: true },
    );
    if (!course) {
        return next(new AppError(404, "Course not found"));
    }

    // Preprocess user data to clean up code fields - remove all spaces and convert to uppercase
    const allUsers = await User.find({});
    for (const user of allUsers) {
        user.courses = user.courses.map((c) => ({
            ...c,
            code: c.code?.replace(/\s+/g, "").toUpperCase(),
        }));
        user.previousCourses = user.previousCourses.map((c) => ({
            ...c,
            code: c.code?.replace(/\s+/g, "").toUpperCase(),
        }));
        user.readOnly = user.readOnly.map((c) => ({
            ...c,
            code: c.code?.replace(/\s+/g, "").toUpperCase(),
        }));
        await user.save();
    }

    const users = await User.find({
        $or: [
            { courses: { $elemMatch: { code: { $regex: `^${codeUpper}$`, $options: "i" } } } },
            {
                previousCourses: {
                    $elemMatch: { code: { $regex: `^${codeUpper}$`, $options: "i" } },
                },
            },
            { readOnly: { $elemMatch: { code: { $regex: `^${codeUpper}$`, $options: "i" } } } },
        ],
    });

    for (const user of users) {
        await UserUpdate.deleteOne({ rollNumber: user.rollNumber });
    }

    res.json(course);
}

/**
 * Delete a course and remove it from all users' course lists
 */
export async function deleteCourse(req, res) {
    res.status(202).json(await scheduleDeletion(req, { kind: "course", code: req.params.code }));
}

export async function linkLegacyCourse(req, res) {
    res.status(202).json(await scheduleCourseLink(req, req.params.code, req.body.legacyCode));
}

export async function bulkLinkCourses(req, res) {
    const isHeaderValue = (val) => {
        if (!val) return true;
        const norm = normalizeCourseCode(val);
        const headerTerms = [
            "OLDCODE",
            "LEGACYCODE",
            "OLD",
            "LEGACY",
            "SOURCECODE",
            "SOURCE",
            "OLDCOURSECODE",
            "OLDCOURSE",
            "LEGACYCOURSECODE",
            "LEGACYCOURSE",
            "NEWCODE",
            "TARGETCODE",
            "NEW",
            "TARGET",
            "TARGETCOURSECODE",
            "NEWCOURSECODE",
            "NEWCOURSE",
            "TARGETCOURSE",
            "CODE",
            "COURSE",
        ];
        return headerTerms.includes(norm);
    };

    const summary = await processUploadedCsv(req.file, { headers: false }, async (results) => {
        const summary = { scheduled: 0, failed: 0, errors: [], operations: [] };
        for (const row of results) {
            const keys = Object.keys(row);
            if (keys.length === 0) continue;

            let rawOld = "";
            let rawNew = "";

            if (row.oldCode || row.legacyCode || row.old || row.sourceCode) {
                rawOld = row.oldCode || row.legacyCode || row.old || row.sourceCode;
                rawNew = row.newCode || row.targetCode || row.new || row.target;
            } else if (keys.length >= 2) {
                rawOld = row[keys[0]];
                rawNew = row[keys[1]];
            } else if (keys.length === 1 && typeof row[keys[0]] === "string") {
                const parts = row[keys[0]].split(",").map((s) => s.trim());
                if (parts.length >= 2) {
                    rawOld = parts[0];
                    rawNew = parts[1];
                }
            }

            if (!rawOld || !rawNew) continue;

            if (isHeaderValue(rawOld) && isHeaderValue(rawNew)) {
                continue;
            }

            const oldCode = normalizeCourseCode(rawOld);
            const newCode = normalizeCourseCode(rawNew);

            if (!oldCode || !newCode) continue;

            try {
                const operation = await scheduleCourseLink(req, newCode, oldCode);
                summary.operations.push({ oldCode, newCode, ...operation });
                summary.scheduled++;
            } catch (err) {
                summary.failed++;
                summary.errors.push({ oldCode, newCode, error: safeError(err).message });
            }
        }

        return summary;
    });
    res.status(202).json({ message: "Link operations scheduled", summary });
}

export async function syncCoursesCacheController(req, res, next) {
    try {
        await runSync();
        res.json({ success: true, message: "Course cache synchronized successfully." });
    } catch (err) {
        next(err);
    }
}

export async function renameCourse(req, res, next) {
    const context = await requireCourse(req, req.params.code, "canManage");
    return mutateContent(req, [context.code, req.body.newCode].filter(Boolean), () =>
        renameCourseAction(req, res, next),
    );
}
