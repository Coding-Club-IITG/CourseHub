import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import path from "node:path";
import mongoose from "mongoose";
import axios from "axios";
import qs from "qs";
import dotenv from "dotenv";
import config from "../config/default.js";
import academic from "../config/academic.js";
import CourseAllotment from "../modules/course/courseAllotment.model.js";
import { lifecycleLogger, flushLogging, getCorrelationId } from "../utils/logger.js";
import { parseCourseAllotmentsFromHtml } from "../utils/course.js";

const __filename = fileURLToPath(import.meta.url);
dotenv.config({ path: path.join(path.dirname(__filename), "../.env") });

export async function runSync({ correlationId = getCorrelationId() || randomUUID() } = {}) {
    lifecycleLogger.info("Course cache job started", { correlationId, attributes: { jobName: "course-cache", operation: "course-cache-sync", outcome: "started" } });
    try {
        const response = await axios.post(
            "https://academic.iitg.ac.in/sso/gen/student1.jsp",
            qs.stringify({ cid: "All", sess: academic.session, yr: academic.currentYear }),
            { headers: { "Content-Type": "application/x-www-form-urlencoded" }, timeout: 60000 }
        );
        if (!response.data) throw new Error("Academic portal returned no data");
        const allotments = parseCourseAllotmentsFromHtml(response.data);
        const bulkOps = Object.keys(allotments).map((roll) => ({
            updateOne: {
                filter: { rollNumber: Number.parseInt(roll), session: academic.session, year: academic.currentYear },
                update: { $set: { courses: allotments[roll] } },
                upsert: true,
            },
        }));
        if (bulkOps.length) {
            await CourseAllotment.bulkWrite(bulkOps);
            lifecycleLogger.info("Course cache job completed", { correlationId, attributes: { dependency: "mongodb", jobName: "course-cache", operation: "course-cache-sync", outcome: "success" } });
        } else {
            lifecycleLogger.warn("Course cache job produced no updates", { correlationId, attributes: { dependency: "academic-portal", jobName: "course-cache", operation: "course-cache-sync", outcome: "empty" } });
        }
    } catch (error) {
        lifecycleLogger.error("Course cache job failed", { error, correlationId, attributes: { dependency: "academic-portal", jobName: "course-cache", operation: "course-cache-sync", outcome: "failure", retryable: true } });
        throw error;
    }
}

if (process.argv[1] === __filename) {
    const correlationId = randomUUID();
    let exitCode = 0;
    try {
        await mongoose.connect(config.mongoURI);
        await runSync({ correlationId });
    } catch {
        exitCode = 1;
    } finally {
        await mongoose.disconnect();
        await flushLogging();
        process.exit(exitCode);
    }
}
