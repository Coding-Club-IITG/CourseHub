import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import mongoose from "mongoose";
import {
    readMaintenanceData,
    inventoryData,
    planDataMigration,
    stageContentImport,
    applyMaintenancePlan,
    planDigest,
} from "../services/dataMaintenance.js";

const digestFile = async (filename) => {
    const hash = createHash("sha256");
    for await (const chunk of createReadStream(filename)) hash.update(chunk);
    return hash.digest("hex");
};
try {
    const [command, ...args] = process.argv.slice(2),
        options = {};
    if (!["inventory", "migrate", "import"].includes(command) || args.length % 2)
        throw new Error("Invalid arguments");
    for (let i = 0; i < args.length; i += 2) {
        if (
            !["--database", "--report", "--manifest", "--apply-plan", "--backup-review"].includes(
                args[i],
            ) ||
            options[args[i]]
        )
            throw new Error("Invalid arguments");
        options[args[i]] = args[i + 1];
    }
    const database = options["--database"],
        reportPath = path.resolve(options["--report"] || "");
    if (
        !/^[a-zA-Z0-9_-]+$/.test(database || "") ||
        !reportPath.split(path.sep).some((part) => part.startsWith("~")) ||
        !process.env.MONGO_URI
    )
        throw new Error("Select a database and new ignored report path");
    const apply = options["--apply-plan"];
    if (
        (command === "inventory" && (apply || options["--manifest"])) ||
        !!apply !== !!options["--backup-review"] ||
        (command === "import" && !apply && !options["--manifest"])
    )
        throw new Error("Select a manifest for staging or a plan and backup review for apply");
    // Reserve evidence before any connection or write
    await fs.mkdir(path.dirname(reportPath), { recursive: true, mode: 0o700 });
    const reportFile = await fs.open(reportPath, "wx", 0o600);
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            dbName: database,
            autoIndex: false,
            autoCreate: false,
            serverSelectionTimeoutMS: 5000,
        });
        let report;
        if (apply) {
            const saved = JSON.parse(await fs.readFile(apply, "utf8"));
            const plan = saved.report || saved;
            const backup = JSON.parse(await fs.readFile(options["--backup-review"], "utf8"));
            if (
                plan.kind !== (command === "migrate" ? "migration" : command) ||
                !backup.path ||
                (await digestFile(path.resolve(backup.path))) !== backup.sha256
            )
                throw new Error("Backup verification failed");
            report = await applyMaintenancePlan(plan, { database, backup });
        } else {
            const data = await readMaintenanceData();
            report =
                command === "inventory"
                    ? inventoryData(data)
                    : command === "migrate"
                      ? planDataMigration(data, database)
                      : await stageContentImport(
                            JSON.parse(await fs.readFile(options["--manifest"], "utf8")),
                            data,
                            database,
                        );
            if (command === "inventory")
                report.retiredTrackingRecords = await mongoose.connection.db
                    .collection("userupdates")
                    .countDocuments();
        }
        await reportFile.writeFile(
            JSON.stringify(
                {
                    database,
                    dryRun: !apply,
                    ...(apply
                        ? { run: report }
                        : {
                              report,
                              ...(command !== "inventory"
                                  ? { planSha256: planDigest(report) }
                                  : {}),
                          }),
                },
                null,
                2,
            ) + "\n",
        );
        console.log(
            JSON.stringify({
                database,
                dryRun: !apply,
                report: reportPath,
                findings: report.findings?.length,
                steps: report.steps?.length,
                status: report.status,
            }),
        );
    } finally {
        await reportFile.close();
    }
} catch (error) {
    console.error(
        error.code === "DATA_REVIEW_REQUIRED"
            ? error.message
            : "Data maintenance failed. Check the selected database, manifest/plan, backup review and new ~-prefixed report path. Saved runs can be resumed with the same plan.",
    );
    process.exitCode = 1;
} finally {
    await mongoose.disconnect();
}
