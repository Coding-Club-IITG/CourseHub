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

        // ObjectIds embed their creation time, so the highest _id is the newest record.
        const records = await EventModel.find().sort({ _id: -1 }).lean();
        console.log(`Found ${records.length} existing Event record(s).`);
        if (records.length === 0) {
            console.log("Nothing to migrate.");
            process.exit(0);
        }

        const newest = records[0];
        console.log(`Newest record: ${newest._id}`);
        console.log(`  firstYearDates: ${JSON.stringify(newest.firstYearDates)}`);
        console.log(`  otherDates: ${JSON.stringify(newest.otherDates)}`);

        if (dryRun) {
            console.log(`Would create record ${EXAM_DATES_ID} with these dates.`);
            console.log(`Would delete ${records.length} old record(s): ${records.map((r) => r._id).join(", ")}`);
            process.exit(0);
        }

        await EventModel.create({
            _id: EXAM_DATES_ID,
            firstYearDates: newest.firstYearDates,
            otherDates: newest.otherDates,
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
