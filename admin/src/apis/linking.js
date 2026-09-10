import { apiFetch } from "./http";
import { API_BASE_URL } from "./server";
export async function linkCourse(legacyCode, code) {
    return (
        await apiFetch(`${API_BASE_URL}api/admin/course/${encodeURIComponent(code)}/link`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ legacyCode }),
        })
    ).json();
}
export async function linkCsv(file) {
    const body = new FormData();
    body.append("file", file);
    return (
        await apiFetch(`${API_BASE_URL}api/admin/courses/bulk-link`, { method: "POST", body })
    ).json();
}
