import AppError from "../../utils/appError.js";
import CourseModel, { FileModel, FolderModel } from "../course/course.model.js";
import fs from "fs";
import csv from "csv-parser";
import User from "../user/user.model.js";
import UserUpdate from "../user/userUpdate.model.js";
import SearchResults from "../search/search.model.js";
import Contribution from "../contribution/contribution.model.js";
import { normalizeCourseCode, getCourseCodeCaseInsensitiveRegex, getCourseTitle } from "../../utils/course.js";
import { runSync } from "../../scripts/syncCoursesCache.js";
import mongoose from "mongoose";
import {deleteFile} from "../file/file.controller.js";
import {DeleteFile} from "../../services/UploadFile.js";
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
export async function uploadCourses(req, res, next) {
    if (!req.file) return next(new AppError(400, "No file uploaded"));
    const results = [];
    fs.createReadStream(req.file.path)
        .pipe(csv(["code", "name"]))
        .on("data", (data) => results.push(data))
        .on("end", async () => {
            try {
                await Promise.all(
                    results.map(async ({ code, name }) => {
                        if (!code || !name) return null;
                        const codeUpper = normalizeCourseCode(code);
                        let course = await CourseModel.findOne({
                            code: getCourseCodeCaseInsensitiveRegex(codeUpper),
                        });
                        if (!course) {
                            course = await CourseModel.create({ code: codeUpper, name });
                        } else {
                            course.code = codeUpper;
                            course.name = name;
                            await course.save();
                        }
                    })
                );
                fs.unlinkSync(req.file.path);
                // Fetch and return the full course list
                const allCourses = await CourseModel.find({});
                res.json(allCourses);
            } catch (err) {
                fs.unlinkSync(req.file.path);
                next(new AppError(500, "Failed to process CSV"));
            }
        });
}

const buildChildren = (depth = 8) => 
{
    if(depth <= 0)
    {
        return undefined;
    }
    const populate = { strictPopulate: false, path: "children"};
    const nested = buildChildren(depth - 1);
    
    if (nested) 
    {
        populate.populate = nested;   
    }
    return populate;
};

export async function getCourseDashboardData(req,res,next)
{

    const {code} = req.params;
    const codeUpper = normalizeCourseCode(code);
    const codeRegex = getCourseCodeCaseInsensitiveRegex(codeUpper);
    
    const course = await CourseModel.findOne({ code: codeRegex }).populate(buildChildren());

    const studentCount = await User.countDocuments({"courses.code": { $regex: `^${codeUpper}$`, $options: "i" }});
    const contributions = await Contribution.find({ courseCode: codeRegex }).sort({ createdAt: -1 }).populate("files");

    res.json({course,studentCount,contributions});
}


const delete_concurrency = 5;

async function runWithConcurrency(items,limit,worker)
{
    for(let i = 0; i < items.length; i += limit)
    {
        await Promise.allSettled(items.slice(i, i + limit).map(worker));
    }
}

async function collectFolderTree(rootFolderId)
{
    const folderIds = [];
    const fileIds = [];
    const seen = new Set();
    let level = [rootFolderId];

    while(level.length > 0)
    {
        const unseen = level.filter((id)=> id && !seen.has(id.toString()));
        unseen.forEach((id) => seen.add(id.toString()));
        
        if(unseen.length === 0) 
            break;

        const folders = await FolderModel.find({ _id: { $in: unseen } })
            .select("_id children childType")
            .lean();

        const nextLevel = [];

        for (const folder of folders) 
        {
            folderIds.push(folder._id);
            const children = Array.isArray(folder.children) ? folder.children : [];
            
            if (folder.childType === "Folder") 
                nextLevel.push(...children);
            
            else if (folder.childType === "File") 
                fileIds.push(...children);
        }
        level = nextLevel;
    }
    return {folderIds, fileIds};
}

async function deleteFolderTree(folderId) 
{

    const { folderIds, fileIds } = await collectFolderTree(folderId);
    if (folderIds.length === 0) return;

    if (fileIds.length > 0) 
    {
        const files = await FileModel.find({ _id: { $in: fileIds } }).select("_id fileId").lean();

        await runWithConcurrency(files.filter((f) => f.fileId),delete_concurrency,(f) => DeleteFile(f.fileId));

        await FileModel.deleteMany({ _id: { $in: fileIds } });
        await Contribution.updateMany({ files: { $in: fileIds } },{ $pull: { files: { $in: fileIds } } });
        await Contribution.deleteMany({ files: { $size: 0 } });
    }

    await FolderModel.deleteMany({ _id: { $in: folderIds } });

    const deletedIds = [...folderIds, ...fileIds];
    await CourseModel.updateMany({ children: { $in: deletedIds } },{ $pull: { children: { $in: deletedIds } } });
    await FolderModel.updateMany({ children: { $in: deletedIds } },{ $pull: { children: { $in: deletedIds } } });
}


export const deleteNode = async (req, res, next) => 
{
    const {type,id} = req.params;

    if(type !== "file" && type !== "folder")
    {
        return next(new AppError(400, "Invalid node type"));
    }

    if(!mongoose.Types.ObjectId.isValid(id))
    {
        return next (new AppError(400, "Invalid node ID"));
    }

    const objectId = new mongoose.Types.ObjectId(id);

    if(type === "file")
    {
        const file = await FileModel.findById(objectId);
        if(!file)
        {
            return next(new AppError(404, "File not found"));
        }

        await CourseModel.updateMany({children : objectId}, {$pull: {children: objectId}});
        await FolderModel.updateMany({children : objectId}, {$pull: {children: objectId}});

        await Contribution.updateMany({files: objectId}, {$pull: {files: objectId}});
        await Contribution.deleteMany({files: {$size: 0}});
        await deleteFile(file);
    }
    else
    {
        const folder = await FolderModel.findById(objectId);
        if(!folder)
        {
            return next(new AppError(404, "Folder not found"));
        }

        await CourseModel.updateMany({children : objectId}, {$pull: {children: objectId}});
        await FolderModel.updateMany({children : objectId}, {$pull: {children: objectId}});
        
        await deleteFolderTree(objectId); 

    }

    return res.json({success:true, message: `${type} deleted successfully`});
};


export async function handleContribution(req,res,next) 
{
    const {contributionId, action} = req.body;

    if(!contributionId)
    {
        return next (new AppError(400, "Contribution ID required"));
    }

    if(action !== "approve" && action !== "reject")
    {
        return next (new AppError(400, "Invalid action. Must be 'approve' or 'reject'"));
    }

    const contribution = await Contribution.findOne({contributionId:contributionId}).populate("files");

    if(!contribution)
    {
        return next (new AppError(404, "Contribution not found"));
    }

    if(action === "approve")
    {
        contribution.approved = true;
        await contribution.save();

        for (const file of contribution.files) 
        {
            await FileModel.findByIdAndUpdate(file._id, { isVerified: true });
        }
        return res.json({ success: true, message: "Contribution approved and files published." });
    }

    else
    {
        const parentFolder = await FolderModel.findById(contribution.parentFolder);
        
        for (const file of contribution.files) 
        {
            if(parentFolder)
            {
                parentFolder.children = parentFolder.children.filter(
                    childId => childId.toString() !== file._id.toString()
                );
            }

            await deleteFile(file);
        }

        if(parentFolder)
        {
            await parentFolder.save();
        }
        await Contribution.findByIdAndDelete(contribution._id);
        return res.json({ success: true, message: "Contribution denied files rejected."});
    }

}

export async function renameCourse(req, res, next) {
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
                { $set: { "courses.$": newCodeUpper } }
            );

            // 2. Update all users' courses that have the old course code
            const usersWithCourses = await User.find({
                "courses.code": { $regex: `^${codeUpper}$`, $options: "i" },
            });
            const courseUpdateResult = await User.updateMany(
                { "courses.code": { $regex: `^${codeUpper}$`, $options: "i" } },
                { $set: { "courses.$.code": newCodeUpper } }
            );

            const usersWithPreviousCourses = await User.find({
                "previousCourses.code": { $regex: `^${codeUpper}$`, $options: "i" },
            });
            const previousCourseUpdateResult = await User.updateMany(
                { "previousCourses.code": { $regex: `^${codeUpper}$`, $options: "i" } },
                { $set: { "previousCourses.$.code": newCodeUpper } }
            );

            const usersWithReadOnly = await User.find({
                "readOnly.code": { $regex: `^${codeUpper}$`, $options: "i" },
            });
            const readOnlyUpdateResult = await User.updateMany(
                { "readOnly.code": { $regex: `^${codeUpper}$`, $options: "i" } },
                { $set: { "readOnly.$.code": newCodeUpper } }
            );

            // 3. Update all contributions with the old course code
            const contributionsToUpdate = await Contribution.find({
                courseCode: getCourseCodeCaseInsensitiveRegex(codeUpper),
            });
            const contributionUpdateResult = await Contribution.updateMany(
                { courseCode: getCourseCodeCaseInsensitiveRegex(codeUpper) },
                { courseCode: newCodeUpper }
            );
        }
    }

    const course = await CourseModel.findOneAndUpdate(
        { code: codeRegex },
        { name, code: newCode ? normalizeCourseCode(newCode) : codeUpper },
        { new: true }
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
 * @description This function safely deletes a course by:
 * 1. Removing the course from all users who have it in their courses, previousCourses, or readOnly arrays
 * 2. Deleting all associated folders and files from the database
 * 3. Deleting all contributions related to this course
 * 4. Marking the course as unavailable in search results
 * 5. Finally deleting the course itself from the database
 * @param {Object} req - Express request object with course code in params
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export async function deleteCourse(req, res, next) {
    const { code } = req.params;

    if (!code) {
        return next(new AppError(400, "Course code required"));
    }

    const codeUpper = normalizeCourseCode(code);
    if (!codeUpper) {
        return next(new AppError(400, "Course code required"));
    }
    const codeRegex = getCourseCodeCaseInsensitiveRegex(codeUpper);

    try {
        // Find the course first
        const course = await CourseModel.findOne({ code: codeRegex });
        if (!course) {
            return next(new AppError(404, "Course not found"));
        }

        // Find all users who have this course and remove it from their lists
        const users = await User.find({
            $or: [
                { courses: { $elemMatch: { code: { $regex: `^${codeUpper}$`, $options: "i" } } } },
                { previousCourses: { $elemMatch: { code: { $regex: `^${codeUpper}$`, $options: "i" } } } },
                { readOnly: { $elemMatch: { code: { $regex: `^${codeUpper}$`, $options: "i" } } } },
            ],
        });

        // Remove the course from each user's lists
        for (const user of users) {
            // Remove from courses array
            user.courses = user.courses.filter((c) => normalizeCourseCode(c.code) !== codeUpper);

            // Remove from previousCourses array
            user.previousCourses = user.previousCourses.filter(
                (c) => normalizeCourseCode(c.code) !== codeUpper
            );

            // Remove from readOnly array
            user.readOnly = user.readOnly.filter((c) => normalizeCourseCode(c.code) !== codeUpper);

            await user.save();

            // Delete user update records for affected users
            await UserUpdate.deleteOne({ rollNumber: user.rollNumber });
        }

        // Delete all associated folders and files
        // Find all folders associated with this course
        const courseFolders = await FolderModel.find({ courses: codeRegex }).populate("children");

        // Process folders that contain files first
        for (const folder of courseFolders) {
            if (folder.childType === "File" && folder.children && folder.children.length > 0) {
                // Delete all files in this folder using the file deletion logic
                for (const file of folder.children) {
                    try {
                        // Check if this folder is shared with other courses
                        // If it is, we might not want to delete the files?
                        // BUT if the user is deleting the course, they probably expect the data to be cleaned up
                        // UNLESS it's a shared folder.
                        // If it's a shared folder, we should ONLY delete files if we are deleting the last reference.
                        if (folder.courses.length <= 1) {
                            // Remove file from database
                            await FileModel.findByIdAndDelete(file._id);

                            // Delete file from OneDrive if fileId exists
                            if (file.fileId) {
                                const { DeleteFile } = await import("../../services/UploadFile.js");
                                await DeleteFile(file.fileId);
                            }
                        }
                    } catch (fileError) {
                        logger.error("Admin file deletion failed", { error: fileError, attributes: { dependency: "microsoft-graph", operation: "delete-file", outcome: "failure", retryable: true } });
                        // Continue with other files even if one fails
                    }
                }
            }
        }

        // Now handle folders: if shared, just pull the code; if not, delete.
        for (const folder of courseFolders) {
            if (folder.courses.length > 1) {
                await FolderModel.updateOne(
                    { _id: folder._id },
                    { $pull: { courses: codeUpper } }
                );
            } else {
                await FolderModel.deleteOne({ _id: folder._id });
            }
        }

        // Delete all contributions related to this course
        const contributionsDeleted = await Contribution.deleteMany({ courseCode: codeRegex });

        // Update search results to mark course as unavailable
        const searchResult = await SearchResults.findOne({ code: codeRegex });
        if (searchResult) {
            await SearchResults.updateOne({ code: codeRegex }, { isAvailable: false });
        }

        // Finally, delete the course from the database
        await CourseModel.deleteOne({ code: codeRegex });

        res.json({
            message: "Course deleted successfully",
            deletedCourse: course,
            affectedUsers: users.length,
            deletedContributions: contributionsDeleted.deletedCount,
        });
    } catch (error) {
        return next(new AppError(500, "Failed to delete course: " + error.message));
    }
}

/**
 * Internal helper to link a legacy course to a target course
 */
const activeLinkLocks = new Map();

async function performLinkWithLock(targetCodeRaw, sourceCodeRaw) {
    const targetCode = normalizeCourseCode(targetCodeRaw);
    const lockKey = targetCode || "global";

    while (activeLinkLocks.has(lockKey)) {
        await activeLinkLocks.get(lockKey);
    }

    let resolver;
    const lockPromise = new Promise((resolve) => { resolver = resolve; });
    activeLinkLocks.set(lockKey, lockPromise);

    try {
        const result = await performLink(targetCodeRaw, sourceCodeRaw);
        return result;
    } finally {
        activeLinkLocks.delete(lockKey);
        resolver();
    }
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
            { $addToSet: { courses: codeToAdd } }
        );
    }
}

async function removeCourseFromFolderTree(startFolderId, codeToRemove) {
    const folderIds = await getAllFolderIdsUnderTree(startFolderId);
    if (folderIds.length === 0) return;

    const folders = await FolderModel.find({ _id: { $in: folderIds } });
    const foldersToDelete = [];
    const foldersToUpdate = [];

    for (const folder of folders) {
        const remainingCourses = (folder.courses || []).filter((c) => c !== codeToRemove);
        if (remainingCourses.length === 0) {
            foldersToDelete.push(folder._id);
        } else {
            foldersToUpdate.push(folder._id);
        }
    }

    if (foldersToDelete.length > 0) {
        const fileFolders = await FolderModel.find({
            _id: { $in: foldersToDelete },
            childType: "File",
        }).select("children");

        for (const f of fileFolders) {
            for (const fileId of f.children) {
                try {
                    await deleteFile(fileId);
                } catch (e) {
                    // ignore individual file deletion errors
                }
            }
        }
        await FolderModel.deleteMany({ _id: { $in: foldersToDelete } });
    }

    if (foldersToUpdate.length > 0) {
        await FolderModel.updateMany(
            { _id: { $in: foldersToUpdate } },
            { $pull: { courses: codeToRemove } }
        );
    }
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
                if (d._id.toString() !== chosen._id.toString()) {
                    await removeCourseFromFolderTree(d._id, targetCode);
                    updatedTargetChildIds = updatedTargetChildIds.filter(
                        (id) => id !== d._id.toString()
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
            updatedTargetChildIds.includes(d._id.toString())
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
                    (id) => id !== matchingTargetDoc._id.toString()
                );
                if (!updatedTargetChildIds.includes(sourceYearDoc._id.toString())) {
                    updatedTargetChildIds.push(sourceYearDoc._id.toString());
                }

                // Remove empty target folder tree
                await removeCourseFromFolderTree(matchingTargetDoc._id, targetCode);

                // Add target code to source folder tree
                await addCourseToFolderTree(sourceYearDoc._id, targetCode);
            } else {
                logger.info("Existing target year retained", { attributes: { operation: "merge-year", outcome: "retained" } });
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
        const course = await performLinkWithLock(code, legacyCode);
        res.json({ message: "Legacy course linked successfully", course });
    } catch (error) {
        return next(new AppError(500, error.message));
    }
}

export async function bulkLinkCourses(req, res, next) {
    if (!req.file) return next(new AppError(400, "No file uploaded"));
    
    const results = [];
    const filePath = req.file.path;

    const cleanupFile = () => {
        if (fs.existsSync(filePath)) {
            try {
                fs.unlinkSync(filePath);
            } catch (e) {
                // ignore unlink errors
            }
        }
    };

    const isHeaderValue = (val) => {
        if (!val) return true;
        const norm = normalizeCourseCode(val);
        const headerTerms = [
            "OLDCODE", "LEGACYCODE", "OLD", "LEGACY", "SOURCECODE", "SOURCE",
            "OLDCOURSECODE", "OLDCOURSE", "LEGACYCOURSECODE", "LEGACYCOURSE",
            "NEWCODE", "TARGETCODE", "NEW", "TARGET", "TARGETCOURSECODE",
            "NEWCOURSECODE", "NEWCOURSE", "TARGETCOURSE", "CODE", "COURSE"
        ];
        return headerTerms.includes(norm);
    };

    fs.createReadStream(filePath)
        .pipe(csv({ headers: false }))
        .on("data", (data) => results.push(data))
        .on("error", (err) => {
            cleanupFile();
            return next(new AppError(400, "Failed to parse CSV file: " + err.message));
        })
        .on("end", async () => {
            const summary = { success: 0, failed: 0, errors: [] };
            try {
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
                        const parts = row[keys[0]].split(",").map(s => s.trim());
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
                        await performLinkWithLock(newCode, oldCode);
                        summary.success++;
                    } catch (err) {
                        summary.failed++;
                        summary.errors.push({ oldCode, newCode, error: err.message });
                    }
                }
                
                cleanupFile();
                res.json({ message: "Bulk linking completed", summary });
            } catch (err) {
                cleanupFile();
                next(new AppError(500, `Failed to process bulk linking CSV: ${err.message}`));
            }
        });
}

export async function syncCoursesCacheController(req, res, next) {
    try {
        await runSync();
        res.json({ success: true, message: "Course cache synchronized successfully." });
    } catch (err) {
        next(new AppError(500, `Cache sync failed: ${err.message}`));
    }
}
