import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import axios from "axios";
import { tokenDirectory } from "../config/storage.js";
import AppError from "../utils/appError.js";

export async function atomicPrivateWrite(filename, content) {
    await fs.mkdir(path.dirname(filename), { recursive: true, mode: 0o700 });
    const temporary = `${filename}.${randomUUID()}.tmp`;
    let handle;
    try {
        handle = await fs.open(temporary, "wx", 0o600);
        await handle.writeFile(content, "utf8");
        await handle.sync();
        await handle.close();
        handle = undefined;
        await fs.rename(temporary, filename);
        const directory = await fs.open(path.dirname(filename), "r");
        try {
            await directory.sync();
        } finally {
            await directory.close();
        }
    } finally {
        await handle?.close();
        await fs.unlink(temporary).catch((error) => {
            if (error.code !== "ENOENT") throw error;
        });
    }
}

export function createTokenStore({
    directory = tokenDirectory,
    request = (data, options) =>
        axios.post(
            `https://login.microsoftonline.com/${encodeURIComponent(process.env.AZURE_TENANT_ID)}/oauth2/v2.0/token`,
            data,
            options,
        ),
    now = Date.now,
} = {}) {
    let cached;
    let refreshing;
    const paths = () => ({
        refresh: path.join(directory(), "onedrive-refresh-token.token"),
        access: path.join(directory(), "onedrive-access-token.json"),
        lock: path.join(directory(), ".onedrive-refresh.lock"),
    });
    async function readCache() {
        try {
            const value = JSON.parse(await fs.readFile(paths().access, "utf8"));
            return typeof value.token === "string" && Number.isFinite(value.expiresAt)
                ? value
                : undefined;
        } catch (error) {
            if (error.code !== "ENOENT" && !(error instanceof SyntaxError)) throw error;
        }
    }
    const usable = (value, rejected) =>
        value?.token && value.expiresAt > now() + 60000 && value.token !== rejected;
    async function withRefreshLock(run) {
        await fs.mkdir(directory(), { recursive: true, mode: 0o700 });
        const lock = paths().lock;
        const owner = randomUUID();
        for (let attempt = 0; attempt < 400; attempt++) {
            try {
                await fs.mkdir(lock, { mode: 0o700 });
                await fs.writeFile(path.join(lock, "owner"), owner, { mode: 0o600 });
                try {
                    const assertOwner = async () => {
                        if ((await fs.readFile(path.join(lock, "owner"), "utf8")) !== owner)
                            throw new AppError(503, "Storage authorization is busy");
                    };
                    return await run(assertOwner);
                } finally {
                    const current = await fs
                        .readFile(path.join(lock, "owner"), "utf8")
                        .catch(() => "");
                    if (current === owner) await fs.rm(lock, { recursive: true, force: true });
                }
            } catch (error) {
                if (error.code !== "EEXIST") throw error;
                const info = await fs.stat(lock).catch(() => null);
                if (info && now() - info.mtimeMs > 120000) {
                    const stale = `${lock}.${owner}.stale`;
                    await fs
                        .rename(lock, stale)
                        .then(() => fs.rm(stale, { recursive: true, force: true }))
                        .catch((failure) => {
                            if (failure.code !== "ENOENT") throw failure;
                        });
                } else await delay(100);
            }
        }
        throw new AppError(503, "Storage authorization is busy");
    }
    async function saveUnlocked(data) {
        if (typeof data.refresh_token !== "string" || !data.refresh_token)
            throw new AppError(502, "Storage authorization was not returned");
        await atomicPrivateWrite(paths().refresh, data.refresh_token);
        if (
            typeof data.access_token === "string" &&
            data.access_token &&
            Number.isFinite(Number(data.expires_in)) &&
            Number(data.expires_in) > 60
        ) {
            cached = {
                token: data.access_token,
                expiresAt: now() + Number(data.expires_in) * 1000,
            };
            await atomicPrivateWrite(paths().access, JSON.stringify(cached));
        } else {
            cached = undefined;
            await fs.unlink(paths().access).catch((error) => {
                if (error.code !== "ENOENT") throw error;
            });
        }
    }
    const save = (data) =>
        withRefreshLock(async (assertOwner) => {
            await assertOwner();
            return saveUnlocked(data);
        });
    async function getAccessToken({ rejected } = {}) {
        if (usable(cached, rejected)) return cached.token;
        if (refreshing) {
            const token = await refreshing;
            if (token !== rejected) return token;
        }
        refreshing = withRefreshLock(async (assertOwner) => {
            cached = await readCache();
            if (usable(cached, rejected)) return cached.token;
            let refresh;
            try {
                refresh = (await fs.readFile(paths().refresh, "utf8")).trim();
            } catch (error) {
                if (error.code !== "ENOENT") throw error;
                throw new AppError(503, "OneDrive authorization is not provisioned");
            }
            if (!refresh) throw new AppError(503, "OneDrive authorization is not provisioned");
            await assertOwner();
            let response;
            try {
                response = await request(
                    new URLSearchParams({
                        client_id: process.env.AZURE_CLIENT_ID,
                        client_secret: process.env.AZURE_CLIENT_SECRET,
                        refresh_token: refresh,
                        grant_type: "refresh_token",
                    }).toString(),
                    {
                        headers: { "Content-Type": "application/x-www-form-urlencoded" },
                        timeout: 30000,
                        maxRedirects: 0,
                    },
                );
            } catch {
                throw new AppError(503, "Storage authorization could not be refreshed");
            }
            const data = response?.data;
            if (
                !data ||
                typeof data.access_token !== "string" ||
                !data.access_token ||
                Number(data.expires_in) <= 60 ||
                !Number.isFinite(Number(data.expires_in))
            )
                throw new AppError(502, "Storage authorization returned an invalid response");
            await assertOwner();
            await saveUnlocked({ ...data, refresh_token: data.refresh_token || refresh });
            return cached.token;
        });
        try {
            return await refreshing;
        } finally {
            refreshing = undefined;
        }
    }
    return {
        getAccessToken,
        save,
        clearMemory: () => {
            cached = undefined;
        },
    };
}

export const storageTokens = createTokenStore();
