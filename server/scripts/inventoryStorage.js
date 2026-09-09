import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import mongoose from "mongoose";
import { FileModel } from "../modules/course/course.model.js";
import { inventoryStorage } from "../services/storageInventory.js";
import { storageRoot } from "../config/storage.js";

try {
    const args = process.argv.slice(2);
    if (
        args.length !== 4 ||
        args[0] !== "--database" ||
        args[2] !== "--report" ||
        !/^[a-zA-Z0-9_-]+$/.test(args[1])
    )
        throw new Error("Expected --database <selected-database> --report <ignored-report.json>");
    const reportPath = path.resolve(args[3]);
    if (!reportPath.split(path.sep).some((part) => part.startsWith("~")))
        throw new Error("Use a ~-prefixed report path");
    if (!process.env.MONGO_URI) throw new Error("Configure MONGO_URI");
    const root = storageRoot();
    await mongoose.connect(process.env.MONGO_URI, {
        dbName: args[1],
        serverSelectionTimeoutMS: 5000,
        autoIndex: false,
        autoCreate: false,
    });
    const files = FileModel.find()
        .select("_id fileId webUrl downloadUrl thumbnail")
        .lean()
        .cursor();
    const report = await inventoryStorage(files, root);
    report.database = args[1];
    await fs.mkdir(path.dirname(reportPath), { recursive: true, mode: 0o700 });
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2) + "\n", {
        flag: "wx",
        mode: 0o600,
    });
    console.log(
        JSON.stringify({
            database: args[1],
            counts: report.counts,
            providerPermissionsVerified: false,
            report: reportPath,
        }),
    );
} catch {
    console.error(
        "Storage inventory failed. Check MONGO_URI, --database and the new ~-prefixed --report path. No database or provider writes are performed.",
    );
    process.exitCode = 1;
} finally {
    await mongoose.disconnect();
}
