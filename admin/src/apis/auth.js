import { apiFetch, setCsrfToken, clearCsrfToken, responseError } from "./http";
import { API_BASE_URL } from "./server.js";

export async function adminLogin({ userId, password }) {
    const res = await apiFetch(`${API_BASE_URL}api/admin/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ userId, password }),
    });
    if (!res.ok) throw await responseError(res, "Login failed");
    const data = await res.json();
    setCsrfToken(data.csrfToken);
    return data;
}

export async function adminLogout() {
    try {
        const res = await apiFetch(`${API_BASE_URL}api/admin/auth/logout`, {
            method: "POST",
            credentials: "include",
        });
        if (!res.ok && res.status !== 401) throw await responseError(res, "Logout failed");
        return res.json();
    } catch (error) {
        if (error.status !== 401) throw error;
    } finally {
        clearCsrfToken();
    }
}

export async function checkAdminSession() {
    const res = await apiFetch(`${API_BASE_URL}api/admin/`, {
        credentials: "include",
    });
    if (res.ok) setCsrfToken((await res.json()).csrfToken);
    return res.ok;
}
