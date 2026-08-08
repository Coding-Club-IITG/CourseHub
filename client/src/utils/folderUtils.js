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
