import mongoose from "mongoose";
import CourseModel from "../models/course.model.js";
import { FileModel, FolderModel } from "../models/course.model.js";
import SearchResults from "../models/search.model.js";
const mongoUri = `mongodb+srv://admin:wlNISeAMiWd3JPPR@coursehub-dev.wyyvbkk.mongodb.net/?retryWrites=true&w=majority`;

async function safeDeleteCourse(code, name) {
    let sanitizedCode = code.toLowerCase();
    let sanitizedName = name.toLowerCase();

    try {
        await CourseModel.deleteOne({ code: sanitizedCode });
    } catch (error) {
        console.log("Error Deleting Course");
    }
    try {
        await FileModel.deleteMany({
            course: `${sanitizedCode} - ${sanitizedName}`,
        });
    } catch (error) {
        console.log("Error Deleting Files");
    }
    try {
        await FolderModel.deleteMany({
            course: sanitizedCode,
        });
    } catch (error) {
        console.log("Error Deleting Folders");
    }
    try {
        await SearchResults.findOneAndUpdate({ code: sanitizedCode }, { isAvailable: false });
    } catch (error) {
        console.log("Error Updating search results");
    }
    console.log("Successfully delete course", sanitizedCode, sanitizedName);
    console.log("Exiting...");
    // process.exit(0);
}
mongoose.set("strictQuery", false);

//TODO: ADD course code and name here
mongoose
    .connect(mongoUri)
    .then(() => {
        safeDeleteCourse("ENTER YOUR COURSE CODE HERE", "CoURSE NAME HERE");
    })
    .catch((e) => console.log(e));
