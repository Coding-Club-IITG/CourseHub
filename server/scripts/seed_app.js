import dotenv from "dotenv";
import mongoose from "mongoose";
import path from "path";
import { fileURLToPath } from "url";
import config from "../config/default.js";
import EventModel from "../modules/event/event.model.js";
import BR from "../modules/br/br.model.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const addDaysAtUtcMidnight = (baseDate, daysToAdd) => {
    const date = new Date(
        Date.UTC(
            baseDate.getUTCFullYear(),
            baseDate.getUTCMonth(),
            baseDate.getUTCDate()
        )
    );
    date.setUTCDate(date.getUTCDate() + daysToAdd);
    return date;
};

const buildExamDateSeed = (today = new Date()) => {
    return {
        firstYearDates: {
            midSem: addDaysAtUtcMidnight(today, 45),
            endSem: addDaysAtUtcMidnight(today, 110),
        },
        otherDates: {
            midSem: addDaysAtUtcMidnight(today, 42),
            endSem: addDaysAtUtcMidnight(today, 105),
        },
    };
};

const seedBrFromEnv = async () => {
    const emailId = (process.env.EMAIL_ID || "").trim().toLowerCase();

    if (!emailId) {
        throw new Error("EMAIL_ID is missing in environment");
    }

    await BR.updateOne({ email: emailId }, { $set: { email: emailId } }, { upsert: true });

    console.log(`Added BR email to list: ${emailId}`);
};

const seedExamDates = async () => {
    try {
        const mongoUri = config.mongoURI || process.env.MONGODB_URI;

        if (!mongoUri) {
            throw new Error("MONGO_URI (or MONGODB_URI) is missing in environment");
        }

        console.log("Connecting to MongoDB...");
        await mongoose.connect(mongoUri);
        console.log("Connected.");

        console.log("Clearing existing exam date documents...");
        await EventModel.deleteMany({});

        const examDateSeed = buildExamDateSeed();

        console.log("Seeding exam dates...");
        const created = await EventModel.create(examDateSeed);

        console.log("Seeding BR from EMAIL_ID...");
        await seedBrFromEnv();

        console.log("Seed completed successfully.");
        console.log(created);
    } catch (error) {
        console.error("Failed to seed exam dates:", error);
        process.exitCode = 1;
    } finally {
        await mongoose.connection.close();
    }
};

await seedExamDates();