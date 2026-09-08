import { FolderModel } from "../modules/course/course.model.js";
import logger from "./logger.js";

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
        logger.error("Folder subtree calculation failed", {
            error: err,
            attributes: {
                dependency: "mongodb",
                operation: "calculate-folder-subtree",
                outcome: "failure",
                retryable: false,
            },
        });
        return 0;
    }
}
