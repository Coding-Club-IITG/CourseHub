import { getAccessToken } from "../modules/onedrive/onedrive.controller.js";
import logger from "../utils/logger.js";
import { extractGraphErrorDetails, formatGraphErrorMessage } from "../utils/graphError.js";

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

            logger.error({ graph: details }, "Graph share lookup failed");
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
            logger.error({ graph: details }, "Graph returned an error payload");

            return res.status(502).json({
                error: "Microsoft Graph responded with an error",
                detail: details.message,
                code: details.code,
                requestId: details.requestId,
            });
        }

        const downloadLink = data["@microsoft.graph.downloadUrl"];
        if (!downloadLink) {
            logger.error(
                {
                    graph: {
                        endpoint: resolvedEndpoint,
                        message: "Missing @microsoft.graph.downloadUrl in Graph response",
                    },
                },
                "Graph response missing download URL"
            );

            return res.status(500).json({ error: "No download link found in Graph response." });
        }

        return res.status(200).json({ downloadLink });
    } catch (err) {
        const details = extractGraphErrorDetails(err);
        logger.error({ graph: details }, formatGraphErrorMessage(details, "Unexpected Graph download error"));
        return res.status(500).json({ error: "Internal server error", detail: details.message });
    }
};
