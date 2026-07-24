import cron from "node-cron";
import { runSync } from "../scripts/syncCoursesCache.js";
import logger from "../utils/logger.js";

export function initScheduler() {
    // Schedule to run at 00:00 on the 1st of every month
    logger.info("Initializing course cache cron scheduler (Monthly on the 1st)...");
    
    cron.schedule("0 0 1 * *", async () => {
        logger.info("Monthly cron trigger: Running course cache synchronization...");
        try {
            await runSync();
            logger.info("Monthly course cache sync completed successfully.");
        } catch (error) {
            logger.error(`Monthly course cache sync failed: ${error.message}`);
        }
    });
}
