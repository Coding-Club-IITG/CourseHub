/**
 * Recursively computes or retrieves the total number of files in a folder's subtree.
 */
export const getSubtreeFileCount = (folder) => {
    if (!folder || typeof folder !== "object") return 0;

    // If explicit totalFileCount property exists and is a number, use it
    if (typeof folder.totalFileCount === "number") {
        return folder.totalFileCount;
    }

    // Leaf folder containing files
    if (folder.childType === "File") {
        return Array.isArray(folder.children) ? folder.children.length : 0;
    }

    // Branch folder containing subfolders
    if (folder.childType === "Folder" && Array.isArray(folder.children)) {
        return folder.children.reduce((total, child) => {
            return total + getSubtreeFileCount(child);
        }, 0);
    }

    return 0;
};
