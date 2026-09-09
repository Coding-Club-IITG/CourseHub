import { transport } from "./http";
import { waitForOperation } from "./Operation";

export const addYear = ({ name, course }) =>
    transport.json("year", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, course, childType: "Folder", Children: [] }),
    });
export const deleteYear = async ({ folderId, courseCode }) => {
    const data = await transport.json("year/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folderId, courseCode }),
    });
    return waitForOperation(data);
};
