import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline/promises";
import axios from "axios";
import { createOAuthProof, createLocalOAuthCallback } from "../utils/oauthProof.js";

const serverDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export async function provisionOneDriveToken() {
    dotenv.config({ path: path.join(serverDir, ".env") });
    const clientId = process.env.AZURE_CLIENT_ID;
    const clientSecret = process.env.AZURE_CLIENT_SECRET;
    const tenantId = process.env.AZURE_TENANT_ID || "850aa78d-94e1-4bc6-9cf3-8c11b530701c";
    const redirectUri =
        process.env.ONEDRIVE_REDIRECT_URI ||
        process.env.REDIRECT_URI ||
        "http://localhost:8080/api/auth/login/redirect";
    if (!clientId || !clientSecret)
        throw new Error("Configure AZURE_CLIENT_ID and AZURE_CLIENT_SECRET in server/.env.");
    const redirect = new URL(redirectUri);
    const scope = "user.read offline_access files.readwrite";
    const proof = createOAuthProof();
    const consume = createLocalOAuthCallback(redirectUri, proof.state);
    const endpoint = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0`;
    const url = new URL(`${endpoint}/authorize`);
    url.search = new URLSearchParams({
        client_id: clientId,
        response_type: "code",
        redirect_uri: redirectUri,
        scope,
        state: proof.state,
        code_challenge: proof.challenge,
        code_challenge_method: "S256",
    }).toString();
    console.log("Open this URL and sign in with the configured OneDrive owner account:");
    console.log(url.href);
    console.log("This sign-in attempt expires in ten minutes.");

    const exchange = async (callbackUrl) => {
        const code = consume(callbackUrl);
        const response = await axios.post(
            `${endpoint}/token`,
            new URLSearchParams({
                client_id: clientId,
                client_secret: clientSecret,
                grant_type: "authorization_code",
                code,
                redirect_uri: redirectUri,
                scope,
                code_verifier: proof.verifier,
            }).toString(),
            { headers: { "Content-Type": "application/x-www-form-urlencoded" }, timeout: 30000 },
        );
        if (!response.data?.refresh_token)
            throw new Error("Microsoft did not return a refresh token.");
        for (const [name, value] of [
            ["onedrive-refresh-token.token", response.data.refresh_token],
            ["onedrive-access-token.token", response.data.access_token],
        ]) {
            if (!value) continue;
            const target = path.join(serverDir, name);
            if (fs.existsSync(target)) fs.chmodSync(target, 0o600);
            fs.writeFileSync(target, value, { encoding: "utf8", mode: 0o600 });
        }
        console.log("OneDrive tokens saved in the server directory with owner-only permissions.");
    };
    const manual = async () => {
        const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 600000);
        try {
            const callbackUrl = await rl.question(
                "Paste the complete redirected URL (including code and state): ",
                { signal: controller.signal },
            );
            await exchange(callbackUrl.trim());
        } finally {
            clearTimeout(timer);
            rl.close();
        }
    };
    if (
        redirect.protocol !== "http:" ||
        !["localhost", "127.0.0.1", "[::1]"].includes(redirect.hostname)
    )
        return manual();
    const port = Number(redirect.port || 80);
    const listener = http.createServer();
    try {
        await new Promise((resolve, reject) => {
            listener.once("error", reject);
            listener.listen(port, redirect.hostname === "[::1]" ? "::1" : "127.0.0.1", resolve);
        });
    } catch (error) {
        if (error.code === "EADDRINUSE") return manual();
        throw error;
    }
    console.log(
        `Listening on the configured loopback callback: ${redirect.origin}${redirect.pathname}`,
    );
    try {
        await new Promise((resolve, reject) => {
            const timer = setTimeout(
                () => reject(new Error("Sign-in timed out. Start again.")),
                600000,
            );
            let processing = false;
            listener.on("request", (req, res) => {
                const callback = new URL(req.url, redirect.origin);
                if (callback.pathname !== redirect.pathname) {
                    res.writeHead(404).end();
                    return;
                }
                if (processing) {
                    res.writeHead(409).end("Sign-in is already processing.");
                    return;
                }
                processing = true;
                exchange(callback.href)
                    .then(() => {
                        res.writeHead(200, {
                            "Content-Type": "text/plain",
                            "Cache-Control": "no-store",
                        }).end("OneDrive tokens saved. You can close this window.");
                        clearTimeout(timer);
                        resolve();
                    })
                    .catch(() => {
                        res.writeHead(400, {
                            "Content-Type": "text/plain",
                            "Cache-Control": "no-store",
                        }).end("Sign-in could not be completed. Start again from the terminal.");
                        clearTimeout(timer);
                        reject(
                            new Error(
                                "OneDrive sign-in failed. Check the callback configuration and start again.",
                            ),
                        );
                    });
            });
        });
    } finally {
        listener.closeAllConnections();
        await new Promise((resolve) => listener.close(resolve));
    }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    provisionOneDriveToken().catch(() => {
        console.error(
            "OneDrive sign-in failed. Check the Azure credentials and registered redirect URI, then start again.",
        );
        process.exitCode = 1;
    });
}
