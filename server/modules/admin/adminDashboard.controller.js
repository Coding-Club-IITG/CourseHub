import {
    presentCourse,
    requireFile,
    requireFolder,
    requireCourse,
    courseContext,
    libraryGraph,
} from "../../services/authorization.js";
import { scheduleDeletion } from "../../services/deletions.js";
import { mutateContent } from "../../services/contentMutation.js";
import { presentContribution } from "../contribution/contribution.controller.js";
import AppError from "../../utils/appError.js";
import CourseModel, { FileModel, FolderModel } from "../course/course.model.js";
import { processUploadedCsv } from "../../utils/uploadedCsv.js";
import { safeError } from "../../middleware/requestErrors.js";
import User from "../user/user.model.js";
import UserUpdate from "../user/userUpdate.model.js";
import SearchResults from "../search/search.model.js";
import Contribution from "../contribution/contribution.model.js";
import {
    normalizeCourseCode,
    getCourseCodeCaseInsensitiveRegex,
    getCourseTitle,
} from "../../utils/course.js";
import { runSync } from "../../scripts/syncCoursesCache.js";
import logger from "../../utils/logger.js";

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

/*
 * Internal helper to link a legacy course to a target course
 */
async function performLinkWithLock(targetCodeRaw, sourceCodeRaw, req) {
    return mutateContent(req, [targetCodeRaw, sourceCodeRaw], () =>
        performLink(targetCodeRaw, sourceCodeRaw),
    );
}

async function getAllFolderIdsUnderTree(startFolderId) {
    const folderIds = [];
    const queue = [startFolderId];
    const visited = new Set();

    while (queue.length > 0) {
        const currentId = queue.shift();
        const idStr = currentId.toString();
        if (visited.has(idStr)) continue;
        visited.add(idStr);
        folderIds.push(idStr);

        const folder = await FolderModel.findById(currentId).select("childType children");
        if (folder && folder.childType === "Folder" && Array.isArray(folder.children)) {
            for (const childId of folder.children) {
                if (childId) queue.push(childId);
            }
        }
    }
    return folderIds;
}

async function addCourseToFolderTree(startFolderId, codeToAdd) {
    const folderIds = await getAllFolderIdsUnderTree(startFolderId);
    if (folderIds.length > 0) {
        await FolderModel.updateMany(
            { _id: { $in: folderIds } },
            { $addToSet: { courses: codeToAdd } },
        );
    }
}

async function removeCourseFromFolderTree(startFolderId, codeToRemove) {
    const ids = await getAllFolderIdsUnderTree(startFolderId);
    const populated = await FolderModel.exists({
        _id: { $in: ids },
        childType: "File",
        "children.0": { $exists: true },
    });
    if (populated) throw new AppError(409, "A populated year cannot be replaced", "LINK_CONFLICT");
    // Linking detaches empty structures
    await FolderModel.updateMany({ _id: { $in: ids } }, { $pull: { courses: codeToRemove } });
}

async function performLink(targetCodeRaw, sourceCodeRaw) {
    const targetCode = normalizeCourseCode(targetCodeRaw);
    const sourceCode = normalizeCourseCode(sourceCodeRaw);

    if (!targetCode || !sourceCode) {
        throw new Error(`Invalid course codes: ${targetCodeRaw}, ${sourceCodeRaw}`);
    }

    if (targetCode === sourceCode) {
        throw new Error(`Target course and legacy course cannot be the same (${targetCode})`);
    }

    let targetCourse = await CourseModel.findOne({
        code: getCourseCodeCaseInsensitiveRegex(targetCode),
    });

    const sourceCourse = await CourseModel.findOne({
        code: getCourseCodeCaseInsensitiveRegex(sourceCode),
    });

    if (!sourceCourse) {
        throw new Error(`Legacy course "${sourceCode}" not found in database`);
    }

    if (!targetCourse) {
        const targetTitle = getCourseTitle(targetCode);
        targetCourse = await CourseModel.create({
            code: targetCode,
            name: targetTitle,
            children: [],
        });
    }

    const isFolderEmpty = async (folderId) => {
        const folder = await FolderModel.findById(folderId).select("childType children");
        if (!folder) return true;

        if (folder.childType === "File") {
            return !folder.children || folder.children.length === 0;
        }

        for (const childId of folder.children || []) {
            const empty = await isFolderEmpty(childId);
            if (!empty) return false;
        }
        return true;
    };

    const targetChildrenIds = (targetCourse.children || []).map((id) => (id._id || id).toString());
    const sourceChildrenIds = (sourceCourse.children || []).map((id) => (id._id || id).toString());

    const targetYearDocs = await FolderModel.find({ _id: { $in: targetChildrenIds } });
    const sourceYearDocs = await FolderModel.find({ _id: { $in: sourceChildrenIds } });

    // Step 1: Detect and clean up any pre-existing duplicate year folders in targetCourse
    const targetYearsByName = {};
    for (const doc of targetYearDocs) {
        if (!doc || !doc.name) continue;
        const normName = doc.name.trim().toLowerCase();
        if (!targetYearsByName[normName]) {
            targetYearsByName[normName] = [];
        }
        targetYearsByName[normName].push(doc);
    }

    let updatedTargetChildIds = [...targetChildrenIds];

    for (const [normName, docs] of Object.entries(targetYearsByName)) {
        if (docs.length > 1) {
            // Find a non-empty folder, or pick the first one
            let chosen = docs[0];
            for (const d of docs) {
                const empty = await isFolderEmpty(d._id);
                if (!empty) {
                    chosen = d;
                    break;
                }
            }
            // Delete and un-link all other duplicate empty folders
            for (const d of docs) {
                if (d._id.toString() !== chosen._id.toString() && (await isFolderEmpty(d._id))) {
                    await removeCourseFromFolderTree(d._id, targetCode);
                    updatedTargetChildIds = updatedTargetChildIds.filter(
                        (id) => id !== d._id.toString(),
                    );
                }
            }
        }
    }

    // Step 2: Merge source year folders into target
    for (const sourceYearDoc of sourceYearDocs) {
        if (!sourceYearDoc || !sourceYearDoc.name) continue;

        const normName = sourceYearDoc.name.trim().toLowerCase();

        const matchingTargetDoc = (targetYearsByName[normName] || []).find((d) =>
            updatedTargetChildIds.includes(d._id.toString()),
        );

        if (matchingTargetDoc) {
            if (matchingTargetDoc._id.toString() === sourceYearDoc._id.toString()) {
                // Already pointing to the exact same year folder! Ensure tag is present.
                await addCourseToFolderTree(sourceYearDoc._id, targetCode);
                continue;
            }

            const targetIsEmpty = await isFolderEmpty(matchingTargetDoc._id);

            if (targetIsEmpty) {
                // Target year folder is empty. Replace it with source year folder.
                updatedTargetChildIds = updatedTargetChildIds.filter(
                    (id) => id !== matchingTargetDoc._id.toString(),
                );
                if (!updatedTargetChildIds.includes(sourceYearDoc._id.toString())) {
                    updatedTargetChildIds.push(sourceYearDoc._id.toString());
                }

                // Remove empty target folder tree
                await removeCourseFromFolderTree(matchingTargetDoc._id, targetCode);

                // Add target code to source folder tree
                await addCourseToFolderTree(sourceYearDoc._id, targetCode);
            } else {
                logger.info("Existing target year retained", {
                    attributes: { operation: "merge-year", outcome: "retained" },
                });
            }
        } else {
            // Year folder only exists in source. Add to target.
            if (!updatedTargetChildIds.includes(sourceYearDoc._id.toString())) {
                updatedTargetChildIds.push(sourceYearDoc._id.toString());
            }
            await addCourseToFolderTree(sourceYearDoc._id, targetCode);
        }
    }

    const finalChildIds = Array.from(new Set(updatedTargetChildIds));
    targetCourse.children = finalChildIds;
    await targetCourse.save();

    return targetCourse;
}

export async function linkLegacyCourse(req, res, next) {
    const { code } = req.params;
    const { legacyCode } = req.body;

    if (!legacyCode) {
        return next(new AppError(400, "Legacy course code required"));
    }

    try {
        const course = await performLinkWithLock(code, legacyCode, req);
        res.json({ message: "Legacy course linked successfully", course });
    } catch (error) {
        return next(error);
    }
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
        const summary = { success: 0, failed: 0, errors: [] };
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
                await performLinkWithLock(newCode, oldCode, req);
                summary.success++;
            } catch (err) {
                summary.failed++;
                summary.errors.push({ oldCode, newCode, error: safeError(err).message });
            }
        }

        return summary;
    });
    res.json({ message: "Bulk linking completed", summary });
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
