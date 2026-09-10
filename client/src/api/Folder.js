import { transport } from "./http";
import { waitForOperation } from "./Operation";

export const createFolder = ({ name, course, parentFolder, childType }) =>
    transport.json("folder/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, course, parentFolder, childType }),
    });
export const deleteFolder = async ({ folderId, courseCode }) => {
    const data = await transport.json("folder/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folderId, courseCode }),
    });
    return waitForOperation(data);
};
export const fetchFolder = (folderId, courseCode) =>
    transport.json(`folder/content/${folderId}${courseCode ? "?courseCode=" + courseCode : ""}`);
export const renameFolder = (folderId, newName, courseCode) =>
    transport.json("folder/rename", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folderId, newName, courseCode }),
    });
