import { randomUUID } from "node:crypto";
import AppError from "../utils/appError.js";
import logger, { getCorrelationId } from "../utils/logger.js";

const defaults = {
    400: ["INVALID_REQUEST", "Invalid request"],
    401: ["AUTH_REQUIRED", "Sign in to continue"],
    403: ["ACCESS_DENIED", "You do not have permission for this action"],
    404: ["NOT_FOUND", "Resource not found"],
    409: ["CONFLICT", "The request conflicts with existing data"],
    413: ["UPLOAD_TOO_LARGE", "The upload exceeds the permitted limit"],
    429: ["RATE_LIMITED", "Too many requests. Try again later."],
    500: ["INTERNAL_ERROR", "Something went wrong. Please try again."],
    502: [
        "PROVIDER_UNAVAILABLE",
        "The storage or sign-in service is unavailable. Try again later.",
    ],
    503: ["SERVICE_UNAVAILABLE", "The service is temporarily unavailable. Try again later."],
    504: ["PROVIDER_TIMEOUT", "The external service took too long. Try again later."],
};

export function safeError(error) {
    let status = error instanceof AppError ? error.status : 500;
    if (error?.isAxiosError)
        status = ["ECONNABORTED", "ETIMEDOUT"].includes(error.code) ? 504 : 502;
    else if (
        ["MongoServerSelectionError", "MongooseServerSelectionError", "MongoNetworkError"].includes(
            error?.name,
        )
    )
        status = 503;
    else if (error?.code === 11000) status = 409;
    else if (
        ["ValidationError", "CastError"].includes(error?.name) ||
        error?.type === "entity.parse.failed"
    )
        status = 400;
    else if (error?.type === "entity.too.large" || error?.code === "LIMIT_FILE_SIZE") status = 413;
    else if (error?.name === "MulterError") status = 400;
    if (!Number.isInteger(status) || status < 400 || status > 599) status = 500;
    const [code, message] = defaults[status] || [
        `HTTP_${status}`,
        "The request could not be completed",
    ];
    const expose = error instanceof AppError && status < 500;
    return {
        status,
        code: (expose && error.code) || code,
        message: expose ? error.message : message,
        ...(expose && error.fieldErrors ? { fieldErrors: error.fieldErrors } : {}),
    };
}

export function requestContext(req, res, next) {
    req.requestId = getCorrelationId() || randomUUID();
    res.setHeader("X-Request-Id", req.requestId);
    const json = res.json.bind(res);
    res.json = (body) => {
        if (res.statusCode >= 400) {
            const supplied =
                typeof body?.message === "string"
                    ? body.message
                    : typeof body?.error === "string"
                      ? body.error
                      : undefined;
            const details = safeError(
                new AppError(
                    res.statusCode,
                    supplied || defaults[res.statusCode]?.[1],
                    body?.code,
                    body?.fieldErrors,
                ),
            );
            const { status, ...data } = details;
            return json({ error: true, ...data, requestId: req.requestId });
        }
        return json(body);
    };
    res.sendStatus = (status) => res.status(status).json({});
    next();
}

export function requestErrorHandler(error, req, res, next) {
    if (res.headersSent) return next(error);
    logger.error("Request failed", {
        error,
        attributes: {
            component: "express-error-handler",
            operation: "request",
            outcome: "failure",
            requestId: req.requestId,
        },
    });
    const { status, ...data } = safeError(error);
    return res.status(status).json(data);
}
