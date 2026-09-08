import axios from "axios";
import serverRoot from "./server";

const API = axios.create({
    baseURL: `${serverRoot}/api`,
    withCredentials: true,
});
export const previewFile = async (fileId) => {
    const { data } = await API.get(`/files/link/${fileId}`);
    return { url: new URL(data.file.webUrl, serverRoot).href };
};
export const verifyFile = async (fileId, courseCode) => {
    const { data } = await API.put(`/files/verify/${fileId}`, { courseCode });
    return data;
};
export const unverifyFile = async (fileId, courseCode) => {
    await API.delete(`/files/unverify/${fileId}`, {
        data: {
            courseCode,
        },
    });
};

export const getFileDownloadLink = async (fileId, courseCode) => {
    const response = await fetch(serverRoot + "/api/files/download", {
        method: "POST",
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ fileId, courseCode }),
    });

    if (!response.ok) {
        throw new Error(`Error fetching download link: ${response.statusText}`);
    }

    const data = await response.json();
    return new URL(data.downloadLink, serverRoot).href;
};

export const renameFile = async (fileId, newName, courseCode) => {
    const { data } = await API.put(`/files/rename/${fileId}`, { newName, courseCode });
    return data;
};
