import mongoose from "mongoose";
import axios from "axios";
import cheerio from "cheerio";
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
import CourseModel from "../modules/course/course.model.js";
import CourseAllotment from "../modules/course/courseAllotment.model.js";
import logger from "../utils/logger.js";
import { normalizeCourseCode } from "../utils/course.js";

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
    const $ = cheerio.load(response.data);

    // 2. Pre-fetch all DB courses to build an in-memory name resolver (avoids thousands of queries)
    const dbCourses = await CourseModel.find({});
    const courseMap = {};
    dbCourses.forEach((c) => {
        courseMap[normalizeCourseCode(c.code)] = c.name;
    });

    // 3. Extract allotments
    const allotments = {}; // rollNumber -> Set of course codes
    
    $("tr").each((i, elem) => {
        const details = $(elem).find("td");
        const rollStr = details.eq(2).text().trim();
        const rawCode = details.eq(3).text().trim();

        if (rollStr && rawCode && !rawCode.includes("SA")) {
            const roll = parseInt(rollStr);
            if (isNaN(roll)) return;
            const normalizedCode = normalizeCourseCode(rawCode);
            
            if (!allotments[roll]) {
                allotments[roll] = new Set();
            }
            allotments[roll].add(normalizedCode);
        }
    });

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
                        courses: Array.from(allotments[roll]),
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
