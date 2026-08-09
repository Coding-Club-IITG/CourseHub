import mongoose from "mongoose";
import dotenv from "dotenv";
import { FolderModel } from "../modules/course/course.model.js";
import { calculateFolderSubtreeCount } from "../utils/folder.js";

dotenv.config();

const envUri = process.env.MONGODB_URI || process.env.MONGO_URI || "mongodb://localhost:27017/coursehub";
// Prepare fallback URIs if host.docker.internal cannot be resolved outside container
const candidateUris = [
    envUri,
    envUri.replace("host.docker.internal", "127.0.0.1"),
    envUri.replace("host.docker.internal", "localhost"),
    "mongodb://127.0.0.1:27017/coursehub",
    "mongodb://localhost:27017/coursehub",
];

async function connectToMongo() {
    for (const uri of [...new Set(candidateUris)]) {
        try {
            console.log(`Connecting to MongoDB at: ${uri}`);
            await mongoose.connect(uri, { serverSelectionTimeoutMS: 3000 });
            console.log("Connected to MongoDB successfully.");
            return;
        } catch (err) {
            console.warn(`Connection failed for ${uri}: ${err.message}`);
        }
    }
    throw new Error("Could not connect to any MongoDB candidate URI.");
}

async function runRecalculation() {
    try {
        await connectToMongo();

        console.log("Fetching all folders...");
        const allFolders = await FolderModel.find({}).select("_id name childType");
        console.log(`Found ${allFolders.length} folders.`);

        // Find leaf folders first (childType === 'File')
        const leafFolders = allFolders.filter((f) => f.childType === "File");
        console.log(`Calculating for ${leafFolders.length} leaf folders...`);
        for (const leaf of leafFolders) {
            await calculateFolderSubtreeCount(leaf._id);
        }

        // Now calculate for all branch folders (childType === 'Folder')
        const branchFolders = allFolders.filter((f) => f.childType === "Folder");
        console.log(`Calculating for ${branchFolders.length} branch folders...`);
        for (const branch of branchFolders) {
            await calculateFolderSubtreeCount(branch._id);
        }

        console.log("Folder file count recalculation completed successfully!");
        process.exit(0);
    } catch (err) {
        console.error("Error running recalculation:", err);
        process.exit(1);
    }
}

runRecalculation();
