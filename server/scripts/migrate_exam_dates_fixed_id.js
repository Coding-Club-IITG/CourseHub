import mongoose from "mongoose";
import config from "../config/default.js";
import EventModel, { EXAM_DATES_ID } from "../modules/event/event.model.js";

const dryRun = process.argv.includes("--dry-run");

async function migrate() {
    try {
        console.log(`Connecting to DB...${dryRun ? " (dry run, no changes will be made)" : ""}`);
        await mongoose.connect(config.mongoURI);
        console.log("Connected to DB.");

        if (await EventModel.exists({ _id: EXAM_DATES_ID })) {
            console.log(`Record with fixed _id ${EXAM_DATES_ID} already exists. Nothing to do.`);
            process.exit(0);
        }

        const records = await EventModel.find().lean();
        console.log(`Found ${records.length} existing Event record(s).`);
        if (records.length === 0) {
            console.log("Nothing to migrate.");
            process.exit(0);
        }

        // Keep the record the old findOne() read returned, so students keep seeing the same dates.
        const current = await EventModel.findOne().lean();
        console.log(`Current record: ${current._id}`);
        console.log(`  firstYearDates: ${JSON.stringify(current.firstYearDates)}`);
        console.log(`  otherDates: ${JSON.stringify(current.otherDates)}`);

        if (dryRun) {
            console.log(`Would create record ${EXAM_DATES_ID} with these dates.`);
            console.log(`Would delete ${records.length} old record(s): ${records.map((r) => r._id).join(", ")}`);
            process.exit(0);
        }

        await EventModel.create({
            _id: EXAM_DATES_ID,
            firstYearDates: current.firstYearDates,
            otherDates: current.otherDates,
        });
        console.log(`Created record ${EXAM_DATES_ID}.`);

        const result = await EventModel.deleteMany({ _id: { $ne: EXAM_DATES_ID } });
        console.log(`Migration completed. Deleted ${result.deletedCount} old record(s).`);

        process.exit(0);
    } catch (error) {
        console.error("Migration failed:", error);
        process.exit(1);
    }
}

migrate();
