import { API_BASE_URL } from "./server";

let csrfToken;
let pending;
export const clearCsrfToken = () => {
    csrfToken = undefined;
};
export const setCsrfToken = (token) => {
    csrfToken = token;
};
async function getCsrfToken() {
    if (csrfToken) return csrfToken;
    if (!pending)
        pending = (async () => {
            const response = await fetch(`${API_BASE_URL}api/auth/csrf?role=admin`, {
                credentials: "include",
                headers: { "X-Session-Role": "admin" },
            });
            const data = await response.json();
            if (!response.ok) {
                const error = new Error(data.message || "Unable to verify your session");
                error.status = response.status;
                throw error;
            }
            if (typeof data.csrfToken !== "string")
                throw new Error("Unable to verify your session");
            csrfToken = data.csrfToken;
            return csrfToken;
        })().finally(() => {
            pending = undefined;
        });
    return pending;
}

export async function apiFetch(url, options = {}) {
    const mutation = !["GET", "HEAD", "OPTIONS"].includes((options.method || "GET").toUpperCase());
    const login = new URL(url, window.location.origin).pathname === "/api/admin/auth/login";
    for (let attempt = 0; attempt < 2; attempt++) {
        const headers = new Headers(options.headers);
        headers.set("X-Session-Role", "admin");
        if (mutation && !login) headers.set("X-CSRF-Token", await getCsrfToken());
        const response = await fetch(url, { ...options, headers, credentials: "include" });
        if (response.status === 401) clearCsrfToken();
        if (
            response.status === 403 &&
            !attempt &&
            (
                await response
                    .clone()
                    .json()
                    .catch(() => ({}))
            ).code === "CSRF_INVALID"
        ) {
            clearCsrfToken();
            continue;
        }
        return response;
    }
}

export async function responseError(response, fallback) {
    const data = await response.json().catch(() => ({}));
    const error = new Error(data.message || fallback);
    error.status = response.status;
    return error;
}
