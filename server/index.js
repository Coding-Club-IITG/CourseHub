import "dotenv/config";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mongoose from "./config/mongoose.js";
import cors from "cors";
import express from "express";
import cookieParser from "cookie-parser";
import ua from "express-useragent";
import config from "./config/default.js";
import { flushLogging, lifecycleLogger, opsHttpMiddleware } from "./utils/logger.js";
import { initScheduler } from "./config/cron.js";
import connectDatabase from "./services/connectDB.js";
import authRoutes from "./modules/auth/auth.routes.js";
import userRoutes from "./modules/user/user.routes.js";
import courseRoutes from "./modules/course/course.routes.js";
import searchRoutes from "./modules/search/search.routes.js";
import eventRoutes from "./modules/event/event.routes.js";
import contributionRoutes from "./modules/contribution/contribution.routes.js";
import adminRoutes from "./modules/admin/admin.routes.js";
import brRoutes from "./modules/br/br.routes.js";
import fileRoutes from "./modules/file/file.routes.js";
import folderRoutes from "./modules/folder/folder.routes.js";
import yearRoutes from "./modules/year/year.routes.js";
import studentRoutes from "./modules/student/student.routes.js";
import { allowedOrigins, validateSecuritySettings } from "./config/security.js";
import { requestContext, requestErrorHandler } from "./middleware/requestErrors.js";
import Session from "./modules/session/session.model.js";
import { OAuthAttempt } from "./services/oauth.js";
import { AuthRateLimit } from "./middleware/authThrottle.js";
import operationRoutes from "./modules/operation/operation.routes.js";
import { OperationModel, CourseLock, StorageLease } from "./modules/operation/operation.model.js";
import { startOperationWorker } from "./services/operationWorker.js";

import importRoutes from "./modules/import/import.routes.js";

const app = express();
const server = http.createServer(app);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
let scheduler;
let operationWorker;
let shutdownPromise;

app.set("trust proxy", validateSecuritySettings());
app.use(opsHttpMiddleware);
app.use(requestContext);
app.use(
    cors({
        origin: (origin, callback) => callback(null, !!origin && allowedOrigins().has(origin)),
        credentials: true,
        exposedHeaders: ["X-Request-Id"],
    }),
);
app.use(cookieParser());
app.use(ua.express());
app.use("/api/admin/imports", importRoutes);
app.use(express.json());
app.get("/api/health", (req, res) => res.json({ status: "ok" }));
app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/course", courseRoutes);
app.use("/api/search", searchRoutes);
app.use("/api/event", eventRoutes);
app.use("/api/contribution", contributionRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/br", brRoutes);
app.use("/api/files", fileRoutes);
app.use("/api/folder", folderRoutes);
app.use("/api/year", yearRoutes);
app.use("/api/student", studentRoutes);
app.use("/api/operations", operationRoutes);
app.use("/api", (req, res) =>
    res.status(404).json({ error: true, message: "API endpoint not found" }),
);

const staticRoot = path.resolve(__dirname, "static");
app.use(express.static(staticRoot));
app.get("/{*path}", (req, res) => res.sendFile("index.html", { root: staticRoot }));
app.use(requestErrorHandler);

async function closeServer() {
    if (!server.listening) return;
    await new Promise((resolve) => server.close(resolve));
}

export function shutdown({ signal, error, exitCode }) {
    if (shutdownPromise) return shutdownPromise;
    shutdownPromise = (async () => {
        const details = {
            attributes: {
                component: "server",
                operation: "shutdown",
                outcome: error ? "failure" : "success",
                ...(signal ? { signal } : {}),
                exitCode,
            },
        };
        if (error)
            lifecycleLogger.fatal("Server terminating after fatal process error", {
                ...details,
                error,
            });
        else lifecycleLogger.info("Server shutdown started", details);
        scheduler?.stop();
        // Stop accepting requests immediately, then drain work before disconnecting MongoDB.
        await Promise.all([closeServer(), operationWorker?.stop()]);
        await mongoose.disconnect();
        await flushLogging();
    })();
    return shutdownPromise;
}

async function terminate(options) {
    try {
        await shutdown(options);
    } finally {
        process.exit(options.exitCode);
    }
}

process.once("SIGINT", () => void terminate({ signal: "SIGINT", exitCode: 0 }));
process.once("SIGTERM", () => void terminate({ signal: "SIGTERM", exitCode: 0 }));
process.once("uncaughtException", (error) => void terminate({ error, exitCode: 1 }));
process.once("unhandledRejection", (error) => void terminate({ error, exitCode: 1 }));

export async function start() {
    await connectDatabase();
    await Promise.all(
        [Session, OAuthAttempt, AuthRateLimit, OperationModel, CourseLock, StorageLease].map(
            (model) => model.createIndexes(),
        ),
    );
    operationWorker = startOperationWorker();
    scheduler = initScheduler();
    await new Promise((resolve, reject) => {
        server.once("error", reject);
        server.listen(config.port, resolve);
    });
    lifecycleLogger.info("Server ready", {
        attributes: { component: "server", operation: "listen", outcome: "success" },
    });
    return server;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    start().catch((error) => void terminate({ error, exitCode: 1 }));
}

export { app, server };
