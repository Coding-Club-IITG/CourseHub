import mongoose from "mongoose";
import config from "../config/default.js";
import { FolderModel } from "../modules/course/course.model.js";

async function migrate() {
    try {
        console.log("Connecting to DB...");
        await mongoose.connect(config.mongoURI);
        console.log("Connected to DB.");

        console.log("Starting migration of folders...");

        // Using direct mongo update for efficiency
        // This converts the 'course' field (string) to 'courses' field (array with that string)
        const result = await FolderModel.updateMany(
            { course: { $exists: true } },
            [
                { $set: { courses: ["$course"] } },
                { $unset: "course" }
            ]
        );

        console.log(`Migration completed. Matched ${result.matchedCount} documents and modified ${result.modifiedCount} documents.`);

        process.exit(0);
    } catch (error) {
        console.error("Migration failed:", error);
        process.exit(1);
    }
}

migrate();
