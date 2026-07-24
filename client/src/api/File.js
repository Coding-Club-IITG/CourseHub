import axios from "axios";
import serverRoot from "./server";

const API = axios.create({
    baseURL: `${serverRoot}/api`,
    withCredentials: true,
});
API.interceptors.request.use((req) => {
    const user = JSON.parse(localStorage.getItem("profile"));
    if (user) req.headers.Authorization = `Bearer ${user.token}`;
    return req;
});
export const downloadFile = async (fileId) => {
    const { data } = await API.get(`/file/download/${fileId}`);
    return data;
};
export const previewFile = async (fileId) => {
    const { data } = await API.get(`/file/preview/${fileId}`);
    return data;
};
export const fetchAllFiles = async () => {
    const { data } = await API.get("/file/all");
    return data;
};
export const verifyFile = async (fileId) => {
    const { data } = await API.put(`/files/verify/${fileId}`);
    return data;
};
export const unverifyFile = async (fileId, oneDriveId, folderId) => {
    await API.delete(`/files/unverify/${fileId}`, {
        data: {
            oneDriveId,
            folderId,
        },
    });
};

export const getThumbnail = async (fileId) => {
    const resp = await axios.post(`${serverRoot}/api/file/thumbnail`, {
        fileId: fileId,
    });
};

export const getFileDownloadLink = async (fileId) => {
    const response = await fetch(serverRoot + "/api/files/download", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: fileId }),
    });

    if (!response.ok) {
        throw new Error(`Error fetching download link: ${response.statusText}`);
    }

    const data = await response.json();
    return data.downloadLink;
};

export const renameFile = async (fileId, newName) => {
    const { data } = await API.put(`/files/rename/${fileId}`, { newName });
    return data;
};
