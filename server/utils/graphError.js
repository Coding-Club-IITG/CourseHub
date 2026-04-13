function normalizeMessage(message) {
    if (!message) return "Microsoft Graph request failed";
    const singleLine = String(message).replace(/\s+/g, " ").trim();
    return singleLine.slice(0, 400);
}

function getGraphErrorPayload(data) {
    if (!data) return {};
    if (typeof data === "string") {
        return {
            message: normalizeMessage(data),
        };
    }

    if (data.error && typeof data.error === "object") {
        return data.error;
    }

    return data;
}

export function extractGraphErrorDetails(error) {
    const response = error?.response;
    const payload = getGraphErrorPayload(response?.data);
    const innerError = payload?.innerError || {};

    const status = response?.status || undefined;
    const code = payload?.code || response?.data?.code || undefined;
    const message = normalizeMessage(
        payload?.message ||
            response?.data?.error_description ||
            error?.message ||
            "Microsoft Graph request failed"
    );
    const requestId =
        innerError?.["request-id"] ||
        response?.headers?.["request-id"] ||
        response?.headers?.["x-ms-request-id"] ||
        undefined;
    const clientRequestId =
        innerError?.["client-request-id"] || response?.headers?.["client-request-id"] || undefined;

    return {
        status,
        code,
        message,
        requestId,
        clientRequestId,
        method: error?.config?.method ? String(error.config.method).toUpperCase() : undefined,
        endpoint: error?.config?.url || undefined,
    };
}

export function formatGraphErrorMessage(details, prefix = "Microsoft Graph request failed") {
    const statusPart = details?.status ? ` (${details.status})` : "";
    const codePart = details?.code ? ` [${details.code}]` : "";
    const message = details?.message || "Unknown error";
    return `${prefix}${statusPart}${codePart}: ${message}`;
}

export function isGraphError(error) {
    if (error?.graphDetails) return true;
    const endpoint = error?.config?.url || error?.response?.config?.url || "";
    return endpoint.includes("graph.microsoft.com");
}

export function logGraphError(logger, error, context = "Microsoft Graph request failed") {
    const details = error?.graphDetails || extractGraphErrorDetails(error);
    logger.error(
        {
            graph: details,
        },
        context
    );
    return details;
}
