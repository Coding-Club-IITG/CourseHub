import assert from "node:assert/strict";
import fs from "node:fs";
import axios from "axios";
import { storageTokens } from "../../services/tokenStore.js";

export function guardExternalServices(t) {
    const attempts = [];
    const deny = (name) => {
        attempts.push(name);
        throw new Error(`External services are blocked in tests: ${name}`);
    };
    t.mock.method(storageTokens, "getAccessToken", () => deny("storage token"));
    for (const method of ["get", "post", "put", "patch", "delete", "request"]) {
        t.mock.method(axios, method, () => deny(`axios.${method}`));
    }
    const originalFetch = globalThis.fetch;
    t.mock.method(globalThis, "fetch", (input, ...rest) => {
        const url = new URL(typeof input === "string" || input instanceof URL ? input : input.url);
        if (!["127.0.0.1", "localhost", "[::1]"].includes(url.hostname)) return deny("fetch");
        return originalFetch(input, ...rest);
    });
    for (const method of ["existsSync", "readFileSync", "writeFileSync"]) {
        const original = fs[method];
        t.mock.method(fs, method, (file, ...rest) => {
            if (String(file).endsWith(".token")) return deny(`token ${method}`);
            return original(file, ...rest);
        });
    }
    t.after(() => assert.deepEqual(attempts, [], "Unexpected provider or token-file access"));
}
