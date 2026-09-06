import mongoose from "mongoose";
import config from "../config/default.js";
import { lifecycleLogger } from "../utils/logger.js";

const connectDatabase = async () => {
    lifecycleLogger.info("Database connection starting", { attributes: { dependency: "mongodb", operation: "connect", outcome: "started" } });
    try {
        await mongoose.connect(config.mongoURI);
        lifecycleLogger.info("Database connection established", { attributes: { dependency: "mongodb", operation: "connect", outcome: "success" } });
    } catch (error) {
        lifecycleLogger.error("Database connection failed", { error, attributes: { dependency: "mongodb", operation: "connect", outcome: "failure", retryable: true } });
        throw error;
    }
};

export default connectDatabase;
