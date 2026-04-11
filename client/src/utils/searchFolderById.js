const search = (folders, id) => {
    if (!Array.isArray(folders) || !id) return null;

    for (const folder of folders) {
        if (folder?._id === id) {
            return folder;
        }

        if (folder?.childType === "Folder") {
            const result = search(folder.children, id);
            if (result) return result;
        }
    }

    return null;
};

const searchFolderById = (root, id) => search(root, id);

export default searchFolderById;
