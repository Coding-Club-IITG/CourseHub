import "dotenv/config";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mongoose from "mongoose";
import cors from "cors";
import express from "express";
import cookieParser from "cookie-parser";
import ua from "express-useragent";
import config from "./config/default.js";
import { flushLogging, lifecycleLogger, logger, opsHttpMiddleware } from "./utils/logger.js";
import { initScheduler } from "./config/cron.js";
import connectDatabase from "./services/connectDB.js";
import catchAsync from "./utils/catchAsync.js";
import User from "./modules/user/user.model.js";
import authRoutes from "./modules/auth/auth.routes.js";
import userRoutes from "./modules/user/user.routes.js";
import onedriveRoutes from "./modules/onedrive/onedrive.routes.js";
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
import seoRoutes from "./modules/seo/seo.routes.js";

const app = express();
const server = http.createServer(app);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
let scheduler;
let shutdownPromise;

app.use(opsHttpMiddleware);
app.use(
    cors({
        origin: [
            "http://localhost:5174",
            "http://localhost:5173",
            "https://coursehub.codingclub.in",
        ],
        credentials: true,
    }),
);
app.use(express.static("static"));
app.use(express.json());
app.use(cookieParser());
app.use(ua.express());
app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/file", onedriveRoutes);
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
app.use(
    "/homepage",
    catchAsync(async (req, res) => {
        const user = await User.findByJWT(req.cookies.token);
        if (!user) return res.redirect(config.clientURL);
        return res.json(user);
    }),
);

app.use((error, req, res, next) => {
    logger.error("Unhandled request error", {
        error,
        attributes: {
            component: "express-error-handler",
            operation: "request",
            outcome: "failure",
            retryable: false,
        },
    });
    const { status = 500, message = "Something went wrong!" } = error;
    return res.status(status).json({ error: true, message });
});
app.use(seoRoutes);
app.get("*", (req, res) => res.sendFile(path.resolve(__dirname, "static", "index.html")));

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
        await closeServer();
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
