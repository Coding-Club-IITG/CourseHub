import mongoose from "mongoose";
import { pathToFileURL } from "node:url";
import config from "../config/default.js";
import CourseModel, { FolderModel, FileModel } from "../modules/course/course.model.js";
import SearchResults from "../modules/search/search.model.js";
import Contribution from "../modules/contribution/contribution.model.js";
import User from "../modules/user/user.model.js";
import { normalizeCourseCode } from "../utils/course.js";

const dbUri = config.mongoURI;

const normalizeFileCourseReference = (courseReference) => {
    if (typeof courseReference !== "string") return courseReference;

    const trimmed = courseReference.trim();
    if (!trimmed) return trimmed;

    const separator = " - ";
    const separatorIndex = trimmed.indexOf(separator);
    if (separatorIndex === -1) {
        return normalizeCourseCode(trimmed);
    }

    const rawCode = trimmed.slice(0, separatorIndex);
    const suffix = trimmed.slice(separatorIndex + separator.length).trim();
    const normalizedCode = normalizeCourseCode(rawCode);
    return suffix ? `${normalizedCode} - ${suffix}` : normalizedCode;
};

const dedupeAndNormalizeCourseEntries = (entries) => {
    if (!Array.isArray(entries)) return [];

    const seen = new Set();
    const normalized = [];

    for (const entry of entries) {
        if (!entry || typeof entry !== "object") continue;

        const normalizedCode = normalizeCourseCode(entry.code);
        if (!normalizedCode || seen.has(normalizedCode)) continue;

        seen.add(normalizedCode);
        normalized.push({
            ...(entry.toObject ? entry.toObject() : entry),
            code: normalizedCode,
        });
    }

    return normalized;
};

const mergeCourseDocuments = async () => {
    const courses = await CourseModel.find({});
    const groupedByCode = new Map();
    let updatedCount = 0;
    let deletedCount = 0;

    for (const course of courses) {
        const normalizedCode = normalizeCourseCode(course.code);
        if (!normalizedCode) continue;

        if (!groupedByCode.has(normalizedCode)) {
            groupedByCode.set(normalizedCode, []);
        }
        groupedByCode.get(normalizedCode).push(course);
    }

    for (const [normalizedCode, docs] of groupedByCode.entries()) {
        const canonical = docs.find((doc) => doc.code === normalizedCode) || docs[0];
        const canonicalId = canonical._id.toString();

        const mergedChildren = new Map();
        const mergedBooks = new Set();
        for (const doc of docs) {
            for (const childId of doc.children || []) {
                mergedChildren.set(childId.toString(), childId);
            }
            for (const book of doc.books || []) {
                if (book) mergedBooks.add(book);
            }
        }

        canonical.code = normalizedCode;
        canonical.children = Array.from(mergedChildren.values());
        canonical.books = Array.from(mergedBooks);
        await canonical.save();

        if (docs.length > 1) {
            for (const duplicate of docs) {
                if (duplicate._id.toString() === canonicalId) continue;
                await CourseModel.deleteOne({ _id: duplicate._id });
                deletedCount += 1;
            }
        }
        updatedCount += 1;
    }

    return { updatedCount, deletedCount };
};

const mergeSearchResultsDocuments = async () => {
    const searchResults = await SearchResults.find({});
    const groupedByCode = new Map();
    let updatedCount = 0;
    let deletedCount = 0;

    for (const item of searchResults) {
        const normalizedCode = normalizeCourseCode(item.code);
        if (!normalizedCode) continue;

        if (!groupedByCode.has(normalizedCode)) {
            groupedByCode.set(normalizedCode, []);
        }
        groupedByCode.get(normalizedCode).push(item);
    }

    for (const [normalizedCode, docs] of groupedByCode.entries()) {
        const canonical = docs.find((doc) => doc.code === normalizedCode) || docs[0];
        const canonicalId = canonical._id.toString();

        canonical.code = normalizedCode;
        canonical.isAvailable = docs.some((doc) => doc.isAvailable);
        if (!canonical.name) {
            canonical.name = docs.find((doc) => doc.name)?.name || "Name Unavailable";
        }
        await canonical.save();

        if (docs.length > 1) {
            for (const duplicate of docs) {
                if (duplicate._id.toString() === canonicalId) continue;
                await SearchResults.deleteOne({ _id: duplicate._id });
                deletedCount += 1;
            }
        }
        updatedCount += 1;
    }

    return { updatedCount, deletedCount };
};

const normalizeFolderCourses = async () => {
    const folders = await FolderModel.find({});
    let updatedCount = 0;

    for (const folder of folders) {
        const normalizedCourseCode = normalizeCourseCode(folder.course);
        if (!normalizedCourseCode || folder.course === normalizedCourseCode) continue;

        folder.course = normalizedCourseCode;
        await folder.save();
        updatedCount += 1;
    }

    return updatedCount;
};

const normalizeFileCourseReferences = async () => {
    const filesCollection = FileModel.collection;
    const filesWithCourseReference = await filesCollection
        .find({ course: { $exists: true, $type: "string" } })
        .toArray();
    let updatedCount = 0;

    for (const file of filesWithCourseReference) {
        const normalizedCourseReference = normalizeFileCourseReference(file.course);
        if (!normalizedCourseReference || normalizedCourseReference === file.course) continue;

        await filesCollection.updateOne(
            { _id: file._id },
            { $set: { course: normalizedCourseReference } }
        );
        updatedCount += 1;
    }

    return updatedCount;
};

const normalizeContributionCourseCodes = async () => {
    const contributions = await Contribution.find({});
    let updatedCount = 0;

    for (const contribution of contributions) {
        const normalizedCourseCode = normalizeCourseCode(contribution.courseCode);
        if (!normalizedCourseCode || contribution.courseCode === normalizedCourseCode) continue;

        contribution.courseCode = normalizedCourseCode;
        await contribution.save();
        updatedCount += 1;
    }

    return updatedCount;
};

const normalizeUserCourseCodes = async () => {
    const users = await User.find({});
    let updatedCount = 0;

    for (const user of users) {
        let changed = false;

        const nextCourses = dedupeAndNormalizeCourseEntries(user.courses);
        if (Array.isArray(user.courses) && nextCourses.length !== user.courses.length) {
            user.courses = nextCourses;
            changed = true;
        } else if (Array.isArray(user.courses)) {
            for (let i = 0; i < user.courses.length; i += 1) {
                const nextCode = nextCourses[i]?.code;
                if (nextCode && user.courses[i]?.code !== nextCode) {
                    user.courses = nextCourses;
                    changed = true;
                    break;
                }
            }
        }

        const nextReadOnly = dedupeAndNormalizeCourseEntries(user.readOnly);
        if (Array.isArray(user.readOnly) && nextReadOnly.length !== user.readOnly.length) {
            user.readOnly = nextReadOnly;
            changed = true;
        } else if (Array.isArray(user.readOnly)) {
            for (let i = 0; i < user.readOnly.length; i += 1) {
                const nextCode = nextReadOnly[i]?.code;
                if (nextCode && user.readOnly[i]?.code !== nextCode) {
                    user.readOnly = nextReadOnly;
                    changed = true;
                    break;
                }
            }
        }

        if (Array.isArray(user.favourites)) {
            for (const favourite of user.favourites) {
                const normalizedCode = normalizeCourseCode(favourite.code);
                if (normalizedCode && favourite.code !== normalizedCode) {
                    favourite.code = normalizedCode;
                    changed = true;
                }
            }
        }

        if (Array.isArray(user.previousCourses)) {
            for (const semesterRecord of user.previousCourses) {
                const originalCourses = semesterRecord?.courses;
                if (!Array.isArray(originalCourses)) continue;

                const normalizedCourses = dedupeAndNormalizeCourseEntries(originalCourses);
                const lengthChanged = normalizedCourses.length !== originalCourses.length;
                const codeChanged =
                    !lengthChanged &&
                    originalCourses.some(
                        (entry, index) => entry?.code !== normalizedCourses[index]?.code
                    );

                if (lengthChanged || codeChanged) {
                    semesterRecord.courses = normalizedCourses;
                    changed = true;
                }
            }
        }

        if (!changed) continue;

        await user.save();
        updatedCount += 1;
    }

    return updatedCount;
};

export async function migrateToUppercase() {
    if (!dbUri) {
        throw new Error("Missing MongoDB connection URI");
    }

    try {
        await mongoose.connect(dbUri);
        console.log("Connected to MongoDB for Uppercase Migration");

        const courseSummary = await mergeCourseDocuments();
        console.log(
            `Normalized CourseModel: updated=${courseSummary.updatedCount}, deletedDuplicates=${courseSummary.deletedCount}`
        );

        const updatedFolders = await normalizeFolderCourses();
        console.log(`Normalized FolderModel.course: updated=${updatedFolders}`);

        const updatedFiles = await normalizeFileCourseReferences();
        console.log(`Normalized FileModel.course references: updated=${updatedFiles}`);

        const searchSummary = await mergeSearchResultsDocuments();
        console.log(
            `Normalized SearchResults: updated=${searchSummary.updatedCount}, deletedDuplicates=${searchSummary.deletedCount}`
        );

        const updatedContributions = await normalizeContributionCourseCodes();
        console.log(`Normalized Contribution.courseCode: updated=${updatedContributions}`);

        const updatedUsers = await normalizeUserCourseCodes();
        console.log(
            `Normalized user course arrays (courses/readOnly/previousCourses/favourites): updated=${updatedUsers}`
        );

        console.log("Migration to uppercase normalization completed successfully");
    } finally {
        await mongoose.disconnect();
    }
}

if (
    process.argv[1] &&
    import.meta.url === pathToFileURL(process.argv[1]).href
) {
    migrateToUppercase()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error("Migration failed:", error);
            process.exit(1);
        });
}
