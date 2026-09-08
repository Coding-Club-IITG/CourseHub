import axios from "axios";
import qs from "querystring";
import AppError from "../../utils/appError.js";
import settings from "../../config/onedrive.js";
import fs from "fs";

let cachedAccessToken = null;
let tokenExpiry = 0;
let refreshPromise = null;
export async function getAccessToken() {
    if (cachedAccessToken && Date.now() < tokenExpiry) {
        return cachedAccessToken;
    }
    if (refreshPromise) {
        return await refreshPromise;
    }

    refreshPromise = (async () => {
        let data;

        if (!fs.existsSync("./onedrive-refresh-token.token")) {
            throw new AppError(503, "OneDrive authorization is not provisioned");
        }
        data = await refreshAccessToken();

        cachedAccessToken = data.access_token;

        tokenExpiry = Date.now() + (data.expires_in - 60) * 1000;

        return cachedAccessToken;
    })();
    try {
        return await refreshPromise;
    } finally {
        refreshPromise = null;
    }
}

export function clearAccessTokenCache() {
    cachedAccessToken = null;
    tokenExpiry = 0;
    refreshPromise = null;
}

async function refreshAccessToken() {
    const data = qs.stringify({
        client_id: settings.clientId,
        client_secret: settings.clientSecret,
        refresh_token: `${fs.readFileSync("./onedrive-refresh-token.token", "utf-8")}`,
        grant_type: "refresh_token",
    });

    const config = {
        method: "post",
        url: `https://login.microsoftonline.com/${settings.tenantId}/oauth2/v2.0/token`,
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Host: "login.microsoftonline.com",
        },
        data,
    };
    const response = await axios.post(config.url, config.data, {
        headers: config.headers,
    });

    if (!response.data) throw new AppError(500, "Something went wrong");

    fs.writeFileSync("./onedrive-access-token.token", response.data.access_token, "utf-8");
    if (response.data.refresh_token) {
        fs.writeFileSync("./onedrive-refresh-token.token", response.data.refresh_token, "utf-8");
    }

    return response.data;
}
