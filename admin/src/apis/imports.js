import { apiFetch } from "./http";
import { API_BASE_URL } from "./server";
const request = async (path, body, signal) => {
    const response = await apiFetch(API_BASE_URL + "api/admin/imports" + path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal,
    });
    return response.json();
};
export const previewImport = (type, rows, signal) => request("/preview", { type, rows }, signal);
export const submitImport = (type, rows, previewDigest, requestId) =>
    request("/", { type, rows, previewDigest, requestId });
