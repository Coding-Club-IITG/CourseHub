import mongoose from "mongoose";
import config from "../config/default.js";
import { FolderModel } from "../modules/course/course.model.js";

async function reverseMigrate() {
    try {
        console.log("Connecting to DB...");
        await mongoose.connect(config.mongoURI);
        console.log("Connected to DB.");

        console.log("Starting reversal of migration...");

        // This converts the 'courses' field (array) back to 'course' field (first element of array)
        const result = await FolderModel.updateMany(
            { courses: { $exists: true, $ne: [] } },
            [
                { $set: { course: { $arrayElemAt: ["$courses", 0] } } },
                { $unset: "courses" }
            ]
        );

        console.log(`Reversal completed. Matched ${result.matchedCount} documents and modified ${result.modifiedCount} documents.`);

        process.exit(0);
    } catch (error) {
        console.error("Reversal failed:", error);
        process.exit(1);
    }
}

reverseMigrate();
