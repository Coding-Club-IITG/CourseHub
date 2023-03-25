import "dotenv/config";
import cors from "cors";
import express from "express";
import AppError from "./utils/appError.js";
import logger from "./utils/logger.js";
import config from "./config/default.js";
import authRoutes from "./modules/auth/auth.routes.js";
import userRoutes from "./modules/user/user.routes.js";
import cookieParser from "cookie-parser";
import catchAsync from "./utils/catchAsync.js";
import User from "./modules/user/user.model.js";

import connectDatabase from "./services/connectDB.js";
connectDatabase();
import onedriveRoutes from "./modules/onedrive/onedrive.routes.js";
import courseRoutes from "./modules/course/course.routes.js";
import searchRoutes from "./modules/search/search.routes.js";
import eventRoutes from "./modules/event/event.routes.js";
import contributionRoutes from "./modules/contribution/contribution.routes.js";
import adminRoutes from "./modules/admin/admin.routes.js";

const app = express();
const PORT = config.port;
app.use(cors());

app.use(express.static("static"));
import path from "path";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.json());
app.use(cookieParser());
app.use(cors({ credentials: true, origin: "http://localhost:5173" }));
app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/file", onedriveRoutes);
app.use("/api/course", courseRoutes);
app.use("/api/search", searchRoutes);
app.use("/api/event", eventRoutes);
app.use("/api/contribution", contributionRoutes);
app.use("/api/admin", adminRoutes);

app.use(
    "/homepage",
    catchAsync(async (req, res, next) => {
        let jwtToken = req.cookies.token;
        const user = await User.findByJWT(jwtToken);
        if (!user) return res.redirect(config.clientURL);
        res.json(user);
    })
);

// Error handler
app.use((err, req, res, next) => {
    logger.error(err.message);
    console.log(err);
    const { status = 500, message = "Something went wrong!" } = err;
    return res.status(status).json({
        error: true,
        message: message,
    });
});

// Set static folder
app.use(express.static("static"));

app.get("*", (req, res) => {
    res.sendFile(path.resolve(__dirname, "static", "index.html"));
});

app.listen(PORT, () => {
    logger.info(`Server on PORT ${PORT}`);
});
