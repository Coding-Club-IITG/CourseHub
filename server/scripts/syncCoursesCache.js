import mongoose from "mongoose";
import axios from "axios";
import qs from "qs";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Load environment variables if running standalone
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../.env") });

import config from "../config/default.js";
import academic from "../config/academic.js";
import CourseAllotment from "../modules/course/courseAllotment.model.js";
import logger from "../utils/logger.js";
import { parseCourseAllotmentsFromHtml } from "../utils/course.js";

export async function runSync() {
    logger.info(`Starting course cache synchronization for ${academic.session} ${academic.currentYear}...`);
    
    // 1. Fetch academic portal HTML
    const ssoUrl = "https://academic.iitg.ac.in/sso/gen/student1.jsp";
    const postData = qs.stringify({
        cid: "All",
        sess: academic.session,
        yr: academic.currentYear,
    });

    logger.info(`Scraping IITG SSO portal: ${ssoUrl}`);
    const response = await axios.post(ssoUrl, postData, {
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
        },
        timeout: 60000, // 60s timeout for large payload
    });

    if (!response.data) {
        throw new Error("Empty response received from academic portal");
    }

    logger.info("Academic portal data received. Parsing HTML...");
    const allotments = parseCourseAllotmentsFromHtml(response.data);

    const studentRolls = Object.keys(allotments);
    logger.info(`Found ${studentRolls.length} students with allotments. Executing bulk DB write...`);

    // 4. Perform bulk write operation
    const bulkOps = studentRolls.map((roll) => {
        return {
            updateOne: {
                filter: {
                    rollNumber: parseInt(roll),
                    session: academic.session,
                    year: academic.currentYear,
                },
                update: {
                    $set: {
                        courses: allotments[roll],
                    },
                },
                upsert: true,
            },
        };
    });

    if (bulkOps.length > 0) {
        const res = await CourseAllotment.bulkWrite(bulkOps);
        logger.info(`Database sync complete: ${res.upsertedCount} inserted, ${res.modifiedCount} updated.`);
    } else {
        logger.warn("No allotments found to write to the cache.");
    }
}

// Standalone execution script support
if (process.argv[1] === __filename) {
    const dbUri = config.mongoURI;
    async function execute() {
        try {
            await mongoose.connect(dbUri);
            logger.info("Connected to MongoDB successfully");
            await runSync();
            process.exit(0);
        } catch (error) {
            logger.error(`CLI cache synchronization failed: ${error.message}`);
            process.exit(1);
        }
    }
    execute();
}
