import axios from "axios";
import { setTimeout as delay } from "node:timers/promises";
import AppError from "../utils/appError.js";
import { storageTokens } from "./tokenStore.js";

export class StorageError extends AppError {
    constructor(providerStatus, code = "STORAGE_UNAVAILABLE", retryAfterMs = 0) {
        super(
            providerStatus === 504 ? 504 : 502,
            "Storage is temporarily unavailable. Please try again.",
            code,
        );
        this.providerStatus = providerStatus;
        this.retryAfterMs = retryAfterMs;
    }
}

export function graphUrl(input) {
    let url;
    try {
        url = new URL(input, "https://graph.microsoft.com/v1.0/");
    } catch {
        throw new StorageError(502, "INVALID_STORAGE_RESPONSE");
    }
    if (
        url.origin !== "https://graph.microsoft.com" ||
        url.username ||
        url.password ||
        url.hash ||
        !/^\/(v1\.0|beta)\//.test(url.pathname)
    )
        throw new StorageError(502, "INVALID_STORAGE_RESPONSE");
    return url.href;
}

export function providerUrl(input) {
    let url;
    try {
        url = new URL(input);
    } catch {
        throw new StorageError(502, "INVALID_STORAGE_RESPONSE");
    }
    if (
        url.protocol !== "https:" ||
        url.username ||
        url.password ||
        url.port ||
        (!/(^|\.)(sharepoint\.com|1drv\.com|onedrive\.com|storage\.live\.com|microsoftusercontent\.com)$/i.test(
            url.hostname,
        ) &&
            !/^[a-z0-9-]+-mediap\.svc\.ms$/i.test(url.hostname))
    )
        throw new StorageError(502, "INVALID_STORAGE_RESPONSE");
    return url.href;
}

export function createGraphClient({
    tokens = storageTokens,
    transport = (config) => axios.request(config),
    sleep = delay,
    now = Date.now,
} = {}) {
    async function request(input, options = {}) {
        const {
            token: suppliedToken,
            preauthenticated = false,
            signal,
            retries = 2,
            trustedOrigin,
            ...config
        } = options;
        const remoteUrl = (value) => {
            if (trustedOrigin) {
                const expected = new URL(trustedOrigin);
                const candidate = new URL(value);
                if (
                    candidate.protocol === "https:" &&
                    candidate.origin === expected.origin &&
                    !candidate.username &&
                    !candidate.password &&
                    candidate.pathname.startsWith(expected.pathname.replace(/\/$/, "") + "/")
                )
                    return candidate.href;
            }
            return providerUrl(value);
        };
        let url = preauthenticated ? remoteUrl(input) : graphUrl(input);
        let token = preauthenticated ? undefined : suppliedToken || (await tokens.getAccessToken());
        let refreshed = false;
        let redirects = 0;
        let retry = 0;
        const headers = Object.fromEntries(
            Object.entries(config.headers || {}).filter(
                ([name]) => name.toLowerCase() !== "authorization",
            ),
        );
        for (;;) {
            signal?.throwIfAborted();
            try {
                const response = await transport({
                    ...config,
                    url,
                    method: config.method || "GET",
                    timeout: 30000,
                    maxRedirects: 0,
                    maxContentLength: 8 * 1024 * 1024,
                    signal,
                    headers: {
                        ...headers,
                        ...(token ? { Authorization: `Bearer ${token}` } : {}),
                    },
                });
                if (!response || !Number.isInteger(response.status))
                    throw new StorageError(502, "INVALID_STORAGE_RESPONSE");
                return response;
            } catch (error) {
                if (signal?.aborted) throw signal.reason;
                if (error instanceof StorageError) throw error;
                const status = error.response?.status;
                error.response?.data?.destroy?.();
                if (
                    [301, 302, 303, 307, 308].includes(status) &&
                    (config.method || "GET") === "GET" &&
                    redirects++ < 3
                ) {
                    url = remoteUrl(error.response.headers?.location);
                    token = undefined;
                    continue;
                }
                if (status === 401 && token && !suppliedToken && !refreshed) {
                    token = await tokens.getAccessToken({ rejected: token });
                    refreshed = true;
                    continue;
                }
                const header = error.response?.headers?.["retry-after"];
                const retryAfterMs = header
                    ? /^\d+(\.\d+)?$/.test(String(header))
                        ? Number(header) * 1000
                        : Date.parse(header) - now()
                    : 0;
                const wait =
                    Math.max(0, Number.isFinite(retryAfterMs) ? retryAfterMs : 0) ||
                    250 * 2 ** retry;
                if (
                    (!status || [429, 500, 502, 503, 504].includes(status)) &&
                    retry++ < retries &&
                    wait <= 30000
                ) {
                    await sleep(wait, undefined, { signal });
                    continue;
                }
                throw new StorageError(
                    ["ETIMEDOUT", "ECONNABORTED"].includes(error.code) ? 504 : status || 502,
                    "STORAGE_UNAVAILABLE",
                    wait,
                );
            }
        }
    }
    async function* pages(input, options = {}) {
        const seen = new Set();
        let url = graphUrl(input);
        while (url) {
            if (seen.has(url) || seen.size >= 1000)
                throw new StorageError(502, "INVALID_STORAGE_PAGINATION");
            seen.add(url);
            const { data } = await request(url, options);
            if (!Array.isArray(data?.value))
                throw new StorageError(502, "INVALID_STORAGE_RESPONSE");
            yield data.value;
            const next = data["@odata.nextLink"];
            if (next !== undefined && (typeof next !== "string" || !next))
                throw new StorageError(502, "INVALID_STORAGE_PAGINATION");
            url = next ? graphUrl(next) : undefined;
        }
    }
    async function collection(input, options) {
        const all = [];
        for await (const page of pages(input, options)) all.push(...page);
        return all;
    }
    return { request, pages, collection };
}

export const graph = createGraphClient();
