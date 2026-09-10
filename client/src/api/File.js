import { transport } from "./http";
import serverRoot from "./server";
import { waitForOperation } from "./Operation";

export const getFilePreviewUrl = (fileId, courseCode) => {
    const query = courseCode ? `?courseCode=${encodeURIComponent(courseCode)}` : "";
    return new URL(`/api/files/preview/${encodeURIComponent(fileId)}${query}`, serverRoot).href;
};
export const verifyFile = (fileId, courseCode) =>
    transport.json(`files/verify/${fileId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseCode }),
    });
export const unverifyFile = async (fileId, courseCode, affectedCourses) => {
    const data = await transport.json(`files/unverify/${fileId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseCode, affectedCourses }),
    });
    return waitForOperation(data);
};
export const getFileDownloadLink = async (fileId, courseCode) => {
    const data = await transport.json("files/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId, courseCode }),
    });
    return new URL(data.downloadLink, serverRoot).href;
};
export const renameFile = (fileId, newName, courseCode) =>
    transport.json(`files/rename/${fileId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newName, courseCode }),
    });
