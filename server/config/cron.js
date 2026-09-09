import cron from "node-cron";
import { scheduleAcademicRefresh } from "../services/academicSync.js";
import { lifecycleLogger } from "../utils/logger.js";

export function initScheduler() {
    return cron.schedule(
        "0 0 1 * *",
        async () => {
            try {
                const operation = await scheduleAcademicRefresh();
                lifecycleLogger.info("Academic refresh scheduled", {
                    attributes: { operationId: operation.operationId, outcome: "scheduled" },
                });
            } catch {
                lifecycleLogger.warn(
                    "Academic refresh could not be scheduled. An administrator can retry",
                );
            }
        },
        { timezone: "Asia/Kolkata" },
    );
}
