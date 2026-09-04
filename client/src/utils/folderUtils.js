/**
 * Recursively computes or retrieves the total number of files in a folder's subtree.
 */
export const getSubtreeFileCount = (folder) => {
    if (!folder || typeof folder !== "object") return 0;

    // Leaf folder containing files
    if (folder.childType === "File") {
        return Array.isArray(folder.children) ? folder.children.length : 0;
    }

    // Branch folder containing subfolders. Prefer live subtree traversal when children are present
    // so ancestor counts stay accurate immediately after in-memory folder updates.
    if (folder.childType === "Folder" && Array.isArray(folder.children)) {
        return folder.children.reduce((total, child) => {
            return total + getSubtreeFileCount(child);
        }, 0);
    }

    // Fallback for partially loaded folder objects without populated children
    if (typeof folder.totalFileCount === "number") {
        return folder.totalFileCount;
    }

    return 0;
};

/**
 * Recursively finds a folder by its _id within a nested folder structure.
 */
export const findFolderById = (folders, id) => {
    if (!folders || !Array.isArray(folders) || !id) return null;
    for (const folder of folders) {
        if (folder?._id === id) return folder;
        if (folder?.children?.length) {
            const result = findFolderById(folder.children, id);
            if (result) return result;
        }
    }
    return null;
};

/**
 * Finds the index of the year within years array that contains targetFolderId either as the year folder itself or in its subtree.
 */
export const findYearIndexForFolder = (years, targetFolderId) => {
    if (!Array.isArray(years) || !targetFolderId) return -1;
    return years.findIndex(
        (y) => y?._id === targetFolderId || findFolderById(y?.children, targetFolderId)
    );
};
