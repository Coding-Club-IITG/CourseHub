import mongoose from "mongoose";
import config from "../config/default.js";
import CourseModel from "../modules/course/course.model.js";
import { bootstrapCourseFolders } from "../modules/course/course.service.js";

const dbUri = config.mongoURI;

async function migrate() {
    try {
        await mongoose.connect(dbUri);
        console.log("Connected to MongoDB");

        const allCourses = await CourseModel.find({});
        console.log(`Processing ${allCourses.length} courses for missing years.`);

        for (const course of allCourses) {
            console.log(`Checking bootstrap for course: ${course.code}`);
            await bootstrapCourseFolders(course.code);
        }

        console.log("Migration/Update completed successfully");
        process.exit(0);
    } catch (error) {
        console.error("Migration failed:", error);
        process.exit(1);
    }
}

migrate();
