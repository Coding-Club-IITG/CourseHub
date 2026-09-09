import API from "./http";
import serverRoot from "./server";
import { waitForOperation } from "./Operation";

export const addYear = async ({ name, course }) => {
    const { data } = await API.post("/year", {
        name,
        course,
        childType: "Folder",
        Children: [],
    });
    return data;
};

export const deleteYear = async ({ folderId, courseCode }) => {
    const { data } = await API.delete("/year/delete", {
        data: { folderId, courseCode },
    });
    return waitForOperation(data);
};
