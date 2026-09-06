import { randomUUID } from "node:crypto";
import cron from "node-cron";
import { runSync } from "../scripts/syncCoursesCache.js";
import { lifecycleLogger } from "../utils/logger.js";

export function initScheduler() {
    lifecycleLogger.info("Course cache scheduler initialized", {
        attributes: { component: "scheduler", jobName: "course-cache", outcome: "success" },
    });
    return cron.schedule("0 0 1 * *", async () => {
        const correlationId = randomUUID();
        try {
            await runSync({ correlationId });
        } catch {}
    });
}
