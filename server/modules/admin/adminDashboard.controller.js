import AppError from "../../utils/appError.js";
import CourseModel, { FileModel, FolderModel } from "../course/course.model.js";
import fs from "fs";
import csv from "csv-parser";
import User from "../user/user.model.js";
import UserUpdate from "../user/userUpdate.model.js";
import SearchResults from "../search/search.model.js";
import Contribution from "../contribution/contribution.model.js";
import { normalizeCourseCode, getCourseCodeCaseInsensitiveRegex } from "../../utils/course.js";

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
            const foldersToUpdate = await FolderModel.find({ course: codeRegex });
            const folderUpdateResult = await FolderModel.updateMany(
                { course: codeRegex },
                { course: newCodeUpper }
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
        const courseFolders = await FolderModel.find({ course: codeRegex }).populate("children");

        // Process folders that contain files first
        for (const folder of courseFolders) {
            if (folder.childType === "File" && folder.children && folder.children.length > 0) {
                // Delete all files in this folder using the file deletion logic
                for (const file of folder.children) {
                    try {
                        // Remove file from database
                        await FileModel.findByIdAndDelete(file._id);

                        // Delete file from OneDrive if fileId exists
                        if (file.fileId) {
                            const { DeleteFile } = await import("../../services/UploadFile.js");
                            await DeleteFile(file.fileId);
                        }
                    } catch (fileError) {
                        console.error(`Error deleting file ${file._id}:`, fileError);
                        // Continue with other files even if one fails
                    }
                }
            }
        }

        // Now delete all folders associated with this course
        await FolderModel.deleteMany({ course: codeRegex });

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
