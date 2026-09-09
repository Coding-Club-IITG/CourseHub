import { apiFetch, setCsrfToken } from "./http";
import { API_BASE_URL } from "./server.js";
import { session } from "../session";
export async function adminLogin({ userId, password }) {
    const res = await apiFetch(API_BASE_URL + "api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, password }),
    });
    const data = await res.json();
    setCsrfToken(data.csrfToken);
    await session.refresh();
    return data;
}
export async function adminLogout() {
    try {
        await apiFetch(API_BASE_URL + "api/admin/auth/logout", { method: "POST" });
    } catch (error) {
        if (error.status !== 401) throw error;
    }
    session.clear();
}
