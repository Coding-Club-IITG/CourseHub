export class ApiError extends Error {
    constructor(status, data = {}, requestId) {
        super(
            data.message ||
                (status === 401
                    ? "Please sign in again."
                    : status === 403
                      ? "You do not have permission to do this."
                      : status === 404
                        ? "This content is unavailable."
                        : "The request could not be completed. Please try again."),
        );
        this.name = "ApiError";
        this.status = status;
        this.code = data.code || (status ? "REQUEST_FAILED" : "NETWORK_ERROR");
        this.fieldErrors = data.fieldErrors;
        this.requestId = data.requestId || requestId;
    }
}

// Shared by JSON requests, streamed downloads and FilePond's upload headers
export function createTransport({ baseUrl, role, fetchImpl = globalThis.fetch }) {
    const base = new URL(baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`);
    let token,
        pending,
        generation = 0,
        sessionGeneration = 0;
    const listeners = new Set();
    const responses = new Set();
    const clearCsrfToken = () => {
        token = undefined;
        pending = undefined;
        generation++;
    };
    const setCsrfToken = (value) => {
        if (typeof value === "string") token = value;
    };
    const endSession = () => {
        sessionGeneration++;
        clearCsrfToken();
    };
    const unauthorized = () => {
        endSession();
        for (const listener of listeners) listener();
    };
    const checkResponse = (status, data) => {
        if (status === 401) unauthorized();
        if (status < 200 || status >= 300) throw new ApiError(status, data);
    };
    const resolve = (path) => {
        const url = new URL(path, base);
        if (url.origin !== base.origin || !url.pathname.startsWith(base.pathname))
            throw new ApiError(400, { message: "Invalid API destination." });
        return url;
    };
    async function request(path, options = {}) {
        await Promise.resolve();
        options.signal?.throwIfAborted();
        const url = resolve(path);
        const method = (options.method || "GET").toUpperCase();
        const login = url.pathname.endsWith("/admin/auth/login");
        const mutation = !["GET", "HEAD", "OPTIONS"].includes(method) && !login;
        const sessionEpoch = sessionGeneration;
        for (let attempt = 0; attempt < 2; attempt++) {
            options.signal?.throwIfAborted();
            const headers = new Headers(options.headers);
            headers.set("X-Session-Role", role);
            if (mutation) headers.set("X-CSRF-Token", await getCsrfToken(false, options.signal));
            options.signal?.throwIfAborted();
            let response;
            try {
                response = await fetchImpl(url.href, {
                    ...options,
                    method,
                    headers,
                    credentials: "include",
                    cache: "no-store",
                });
            } catch (error) {
                if (options.signal?.aborted || error.name === "AbortError") throw error;
                throw new ApiError(0);
            }
            if (sessionEpoch !== sessionGeneration)
                throw new DOMException("The session changed.", "AbortError");
            if (response.ok) {
                if (
                    responses.size &&
                    response.headers.get("content-type")?.includes("application/json")
                ) {
                    const data = await response
                        .clone()
                        .json()
                        .catch(() => null);
                    options.signal?.throwIfAborted();
                    if (sessionEpoch !== sessionGeneration)
                        throw new DOMException("The session changed.", "AbortError");
                    for (const listener of responses)
                        listener({ url, method, data, body: options.body });
                }
                return response;
            }
            const data = await response.json().catch(() => ({}));
            if (response.status === 403 && data.code === "CSRF_INVALID" && !attempt && mutation) {
                if (token === headers.get("X-CSRF-Token")) clearCsrfToken();
                continue;
            }
            if (response.status === 401 && !login && sessionEpoch === sessionGeneration) {
                unauthorized();
            }
            throw new ApiError(response.status, data, response.headers.get("X-Request-ID"));
        }
    }
    async function json(path, options) {
        const epoch = generation;
        const sessionEpoch = sessionGeneration;
        const response = await request(path, options);
        if (response.status === 204) return null;
        let data;
        try {
            data = await response.json();
        } catch {
            throw new ApiError(502, {
                code: "INVALID_RESPONSE",
                message: "The server returned an unreadable response. Please try again.",
            });
        }
        if (sessionEpoch !== sessionGeneration)
            throw new DOMException("The session changed.", "AbortError");
        if (epoch === generation) setCsrfToken(data?.csrfToken);
        return data;
    }
    async function getCsrfToken(refresh = false, signal) {
        if (refresh) clearCsrfToken();
        signal?.throwIfAborted();
        if (!token) {
            if (!pending) {
                const epoch = generation;
                const work = json(`auth/csrf?role=${role}`)
                    .then((data) => {
                        if (typeof data?.csrfToken !== "string") throw new ApiError(502);
                        if (epoch === generation) token = data.csrfToken;
                        return data.csrfToken;
                    })
                    .finally(() => {
                        if (pending === work) pending = undefined;
                    });
                pending = work;
            }
            // A cancelled consumer must not cancel another request's shared token refresh.
            const current = pending;
            if (!signal) return current;
            return new Promise((resolve, reject) => {
                const abort = () => reject(signal.reason);
                signal.addEventListener("abort", abort, { once: true });
                current
                    .then((value) => {
                        signal.throwIfAborted();
                        resolve(value);
                    }, reject)
                    .catch(reject)
                    .finally(() => signal.removeEventListener("abort", abort));
            });
        }
        return token;
    }
    return {
        request,
        json,
        getCsrfToken,
        setCsrfToken,
        clearCsrfToken,
        checkResponse,
        endSession,
        uploadHeaders: async (signal) => ({
            "X-Session-Role": role,
            "X-CSRF-Token": await getCsrfToken(false, signal),
        }),
        onResponse(listener) {
            responses.add(listener);
            return () => responses.delete(listener);
        },
        onUnauthorized(listener) {
            listeners.add(listener);
            return () => listeners.delete(listener);
        },
    };
}
