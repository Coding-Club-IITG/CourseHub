import server from "./server";

let token;
let pending;
export function setCsrfToken(value) {
    token = value;
}
export function clearCsrfToken() {
    token = undefined;
}
export async function getCsrfToken(refresh = false) {
    if (refresh) token = undefined;
    if (token) return token;
    if (!pending)
        pending = (async () => {
            const response = await fetch(`${server}/api/auth/csrf?role=student`, {
                credentials: "include",
                headers: { "X-Session-Role": "student" },
            });
            const data = await response.json();
            if (!response.ok) {
                const error = new Error(data.message || "Unable to verify your session");
                error.response = { status: response.status, data };
                throw error;
            }
            if (typeof data.csrfToken !== "string")
                throw new Error("Unable to verify your session");
            token = data.csrfToken;
            return token;
        })().finally(() => {
            pending = undefined;
        });
    return pending;
}
