import { getAccessToken } from "../modules/onedrive/onedrive.controller.js";
import logger from "../utils/logger.js";
import { extractGraphErrorDetails } from "../utils/graphError.js";

const encodeGraphShareUrl = (shareUrl) => {
    let base64;
    if (typeof Buffer !== "undefined") {
        base64 = Buffer.from(shareUrl, "utf8").toString("base64");
    } else {
        base64 = btoa(shareUrl);
    }

    return `u!${base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")}`;
};

export const downloadFiles = async (req, res) => {
    const access = await getAccessToken();
    const endpoint = "https://graph.microsoft.com/v1.0/shares/{encoded}/driveItem";

    try {
        const inputUrl = req.body?.url;
        if (!inputUrl) {
            return res
                .status(400)
                .json({ error: "Please provide a SharePoint/OneDrive share URL in request body as `url`." });
        }

        const encoded = encodeGraphShareUrl(inputUrl);
        const resolvedEndpoint = endpoint.replace("{encoded}", encoded);

        const response = await fetch(resolvedEndpoint, {
            method: "GET",
            headers: {
                Authorization: `Bearer ${access}`,
            },
        });

        if (!response.ok) {
            const text = await response.text().catch(() => "");
            let parsedPayload = text;
            try {
                parsedPayload = text ? JSON.parse(text) : text;
            } catch {
                parsedPayload = text;
            }

            const details = extractGraphErrorDetails({
                config: { method: "get", url: resolvedEndpoint },
                response: {
                    status: response.status,
                    headers: Object.fromEntries(response.headers.entries()),
                    data: parsedPayload,
                },
            });

            logger.error("Graph share lookup failed", { error: new Error("Graph share lookup failed"), attributes: { dependency: "microsoft-graph", operation: "lookup-share", outcome: "failure", retryable: true } });
            return res.status(502).json({
                error: "Failed to fetch file details from Microsoft Graph",
                status: details.status,
                code: details.code,
                detail: details.message,
                requestId: details.requestId,
            });
        }

        const data = await response.json();

        if (data.error) {
            const details = extractGraphErrorDetails({
                config: { method: "get", url: resolvedEndpoint },
                response: { status: 502, data },
            });
            logger.error("Graph share lookup failed", { error: new Error("Graph returned an error response"), attributes: { dependency: "microsoft-graph", operation: "lookup-share", outcome: "failure", retryable: true } });

            return res.status(502).json({
                error: "Microsoft Graph responded with an error",
                detail: details.message,
                code: details.code,
                requestId: details.requestId,
            });
        }

        const downloadLink = data["@microsoft.graph.downloadUrl"];
        if (!downloadLink) {
            logger.error("Graph response missing download URL", { attributes: { dependency: "microsoft-graph", operation: "lookup-share", outcome: "failure", retryable: false } });

            return res.status(500).json({ error: "No download link found in Graph response." });
        }

        return res.status(200).json({ downloadLink });
    } catch (err) {
        const details = extractGraphErrorDetails(err);
        logger.error("Graph download failed", { error: err, attributes: { dependency: "microsoft-graph", operation: "download-file", outcome: "failure", retryable: true } });
        return res.status(500).json({ error: "Internal server error", detail: details.message });
    }
};
