import "dotenv/config";
import { fileURLToPath } from "node:url";
import mongoose from "mongoose";
import config from "../config/default.js";
import { scheduleAcademicRefresh } from "../services/academicSync.js";
import { OperationModel } from "../modules/operation/operation.model.js";

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    try {
        const args = process.argv.slice(2);
        if (args.length !== 2 || args[0] !== "--database" || !/^[a-zA-Z0-9_-]+$/.test(args[1]))
            throw new Error(
                "Use --database <explicit-target>. This schedules an upstream refresh for the running API worker.",
            );
        await mongoose.connect(config.mongoURI, { dbName: args[1] });
        await OperationModel.createIndexes();
        console.log(JSON.stringify(await scheduleAcademicRefresh()));
    } catch (error) {
        console.error("Academic refresh could not be queued. Check MONGO_URI and --database <explicit-target>; a worker on that database must be running.");
        process.exitCode = 1;
    } finally {
        await mongoose.disconnect();
    }
}
