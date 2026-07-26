import { FolderModel } from "../modules/course/course.model.js";
import { normalizeCourseCode } from "./course.js";

/**
 * Recursively calculates and updates totalFileCount for a folder document in DB.
 * Returns the computed total file count.
 */
export async function calculateFolderSubtreeCount(folderId) {
    if (!folderId) return 0;

    try {
        const folder = await FolderModel.findById(folderId);
        if (!folder) return 0;

        let count = 0;

        if (folder.childType === "File") {
            count = Array.isArray(folder.children) ? folder.children.length : 0;
        } else if (folder.childType === "Folder") {
            if (Array.isArray(folder.children) && folder.children.length > 0) {
                for (const childId of folder.children) {
                    const childCount = await calculateFolderSubtreeCount(childId);
                    count += childCount;
                }
            }
        }

        await FolderModel.updateOne({ _id: folderId }, { $set: { totalFileCount: count } });
        return count;
    } catch (err) {
        console.error(`Error calculating subtree count for folder ${folderId}:`, err);
        return 0;
    }
}

/**
 * Recalculates subtree count for a parent folder and bubbles up to root folders.
 */
export async function recalculateParentFolderCounts(parentFolderId) {
    if (!parentFolderId) return;

    try {
        await calculateFolderSubtreeCount(parentFolderId);

        // Find any parent folder that has parentFolderId in its children
        const parents = await FolderModel.find({ children: parentFolderId });
        for (const parent of parents) {
            await recalculateParentFolderCounts(parent._id);
        }
    } catch (err) {
        console.error(`Error recalculating parent folder counts for ${parentFolderId}:`, err);
    }
}

/**
 * Attaches/computes totalFileCount on populated folder objects for API responses,
 * optionally filtering child folders by courseCode.
 */
export function computePopulatedFolderSubtreeCount(folderObj, courseCodeFilter = null) {
    if (!folderObj) return 0;

    const normalizedCode = courseCodeFilter ? normalizeCourseCode(courseCodeFilter) : null;

    if (folderObj.childType === "File") {
        const count = Array.isArray(folderObj.children) ? folderObj.children.length : 0;
        folderObj.totalFileCount = count;
        return count;
    }

    if (folderObj.childType === "Folder") {
        let total = 0;
        if (Array.isArray(folderObj.children)) {
            // Filter children if courseCodeFilter is active
            if (normalizedCode) {
                folderObj.children = folderObj.children.filter((child) => {
                    if (child && child.childType === "Folder") {
                        return child.courses && child.courses.includes(normalizedCode);
                    }
                    return true;
                });
            }

            for (const child of folderObj.children) {
                if (child && typeof child === "object") {
                    total += computePopulatedFolderSubtreeCount(child, courseCodeFilter);
                }
            }
        }
        folderObj.totalFileCount = total;
        return total;
    }

    folderObj.totalFileCount = folderObj.totalFileCount || 0;
    return folderObj.totalFileCount;
}
