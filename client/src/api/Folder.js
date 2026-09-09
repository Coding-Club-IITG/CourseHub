import API from "./http";

import { waitForOperation } from "./Operation";

export const createFolder = async ({ name, course, parentFolder, childType }) => {
    const { data } = await API.post("/folder/create", {
        name,
        course,
        parentFolder,
        childType,
    });
    return data;
};

export const deleteFolder = async ({ folderId, courseCode }) => {
    const { data } = await API.delete(`/folder/delete`, {
        data: { folderId, courseCode },
    });
    return waitForOperation(data);
};

export const fetchFolder = async (folderId, courseCode) => {
    const url = courseCode
        ? `/folder/content/${folderId}?courseCode=${courseCode}`
        : `/folder/content/${folderId}`;
    const response = await API.get(url);
    if (response.status !== 200) {
        throw new Error("Failed to fetch folder data");
    }
    const data = response.data;
    return data;
};

export const renameFolder = async (folderId, newName, courseCode) => {
    const response = await API.post("/folder/rename", {
        folderId,
        newName,
        courseCode,
    });
    if (response.status !== 200) {
        throw new Error("Failed to rename folder");
    }
    return response.data;
};
