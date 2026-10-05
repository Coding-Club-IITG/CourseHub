import { fileURLToPath } from "url";
import dotenv from "dotenv";
import http from "http";
import mongoose from "mongoose";
import OneDriveCredential, {
    ONEDRIVE_CREDENTIAL_ID,
} from "../modules/onedrive/OneDriveCredential.js";
import path from "path";
import readline from "readline";
import axios from "axios";
import qs from "querystring";

// Resolve server configuration independently of the working directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serverDir = path.resolve(__dirname, "..");

dotenv.config({ path: path.join(serverDir, ".env") });

const clientId = process.env.AZURE_CLIENT_ID;
const clientSecret = process.env.AZURE_CLIENT_SECRET;
const tenantId = process.env.AZURE_TENANT_ID || "850aa78d-94e1-4bc6-9cf3-8c11b530701c";
const redirectUri = process.env.REDIRECT_URI || "http://localhost:8080/api/auth/login/redirect";

const scopes = "user.read offline_access files.readwrite";

const authUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(
    redirectUri,
)}&scope=${encodeURIComponent(scopes)}&state=12345`;

export const exchangeCodeForTokens = async (code) => {
    try {
        console.log("⏳ Exchanging authorization code for tokens...");

        const data = qs.stringify({
            client_id: clientId,
            client_secret: clientSecret,
            grant_type: "authorization_code",
            code: code.trim(),
            redirect_uri: redirectUri,
            scope: scopes,
        });

        const response = await axios.post(
            `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
            data,
            {
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                },
            },
        );

        if (typeof response.data?.refresh_token !== "string" || !response.data.refresh_token) {
            throw new Error("No refresh_token returned in response from Microsoft");
        }

        await OneDriveCredential.updateOne(
            { _id: ONEDRIVE_CREDENTIAL_ID },
            { $set: { refreshToken: response.data.refresh_token } },
            { upsert: true, runValidators: true },
        );
        console.log("OneDrive authorization saved to MongoDB.");

        return true;
    } catch {
        console.error(
            "OneDrive authorization could not be saved. Check configuration, database connectivity, and owner consent.",
        );
        return false;
    }
};

async function main() {
    if (!clientId || !clientSecret || !process.env.MONGO_URI) {
        console.error(
            "Configure AZURE_CLIENT_ID, AZURE_CLIENT_SECRET and MONGO_URI in server/.env.",
        );
        process.exitCode = 1;
        return;
    }
    await mongoose.connect(process.env.MONGO_URI);
    console.log("\n========================================================================");
    console.log("🔑 COURSEHUB ONEDRIVE REFRESH TOKEN GENERATOR");
    console.log("========================================================================\n");
    console.log("1. Open the following URL in your browser:\n");
    console.log(`   ${authUrl}\n`);
    console.log("2. Sign in with the Coding Club (OneDrive owner) Microsoft account.");
    console.log(
        "3. Grant consent for requested permissions (user.read, offline_access, files.readwrite).\n",
    );

    const parsedUrl = new URL(redirectUri);
    const port = parseInt(parsedUrl.port || "8080", 10);

    const server = http.createServer(async (req, res) => {
        const reqUrl = new URL(req.url, `http://${req.headers.host}`);
        if (
            reqUrl.pathname === parsedUrl.pathname ||
            reqUrl.pathname === "/api/auth/login/redirect"
        ) {
            const code = reqUrl.searchParams.get("code");
            if (code) {
                res.writeHead(200, { "Content-Type": "text/html" });
                res.end(`
                    <div style="font-family: sans-serif; text-align: center; padding: 50px;">
                        <h2 style="color: #10B981;">✅ OneDrive Authorization Received!</h2>
                        <p>Saving OneDrive authorization to MongoDB...</p>
                        <p>You can close this window now.</p>
                    </div>
                `);
                const success = await exchangeCodeForTokens(code);
                server.close(async () => {
                    await mongoose.disconnect();
                    process.exitCode = success ? 0 : 1;
                });
                return;
            }
        }
        res.writeHead(404);
        res.end();
    });

    server.on("error", async (err) => {
        if (err.code === "EADDRINUSE") {
            console.log(
                `ℹ️  Note: Port ${port} is currently in use (e.g. CourseHub dev server is running).`,
            );
            console.log(
                "   After signing in, copy the 'code' parameter from the redirected browser URL bar.\n",
            );

            const rl = readline.createInterface({
                input: process.stdin,
                output: process.stdout,
            });

            rl.question("Paste the 'code' parameter here: ", async (inputCode) => {
                rl.close();
                const success = await exchangeCodeForTokens(inputCode);
                await mongoose.disconnect();
                process.exitCode = success ? 0 : 1;
            });
        } else {
            console.error("Unable to start the authorization callback server.");
            await mongoose.disconnect();
            process.exitCode = 1;
        }
    });

    server.listen(port, () => {
        console.log(
            `🌐 Listening on http://localhost:${port} for automated callback redirect...\n`,
        );
    });
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
    main().catch(async () => {
        console.error(
            "Unable to initialize OneDrive authorization. Check database connectivity and configuration.",
        );
        await mongoose.disconnect();
        process.exitCode = 1;
    });
}
