import API from "./http";
import serverRoot from "./server";

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
    const { data } = await API.post("/files/download", { fileId, courseCode });
    return new URL(data.downloadLink, serverRoot).href;
};

export const renameFile = async (fileId, newName, courseCode) => {
    const { data } = await API.put(`/files/rename/${fileId}`, { newName, courseCode });
    return data;
};
