import { createOpsLogger } from "@coding-club-iitg/ops-logger";
import { createExpressOpsLogger } from "@coding-club-iitg/ops-logger/express";

const ALL_LEVELS = ["debug", "info", "warn", "error", "fatal"];
const PLACEHOLDER_URL = "http://127.0.0.1/disabled";
const PLACEHOLDER_SECRET = "disabled-coursehub-logging-secret";

function parseEnabled(value) {
    if (value === "true") return true;
    if (value === "false") return false;
    throw new TypeError("OPS_LOGGING_ENABLED must be explicitly true or false");
}

export function readLoggingConfig(env = process.env) {
    const enabled = parseEnabled(env.OPS_LOGGING_ENABLED);
    const production = env.NODE_ENV === "production";
    const ingestionUrl = env.OPS_LOG_INGEST_URL || PLACEHOLDER_URL;
    const secret = env.OPS_LOG_INGEST_SECRET || PLACEHOLDER_SECRET;
    if (enabled && production) {
        const url = new URL(ingestionUrl);
        if (url.protocol !== "https:") throw new TypeError("OPS_LOG_INGEST_URL must use HTTPS in production");
        if (secret.length < 32 || /placeholder|change[-_ ]?me|disabled/i.test(secret)) {
            throw new TypeError("OPS_LOG_INGEST_SECRET must be a non-placeholder secret of at least 32 characters");
        }
    }
    return { enabled, ingestionUrl, secret };
}

const baseConfig = { project: "coursehub", service: "coursehub-backend", ...readLoggingConfig() };
const expressLogging = createExpressOpsLogger({ ...baseConfig, exportLevels: ALL_LEVELS });

export const opsHttpMiddleware = expressLogging.middleware;
export const getCorrelationId = expressLogging.getCorrelationId;
export const logger = createOpsLogger({ ...baseConfig, getCorrelationId });
export const lifecycleLogger = createOpsLogger({ ...baseConfig, exportLevels: ALL_LEVELS });
export async function flushLogging() {
    return Promise.all([logger.flush(), expressLogging.logger.flush(), lifecycleLogger.flush()]);
}
export default logger;
