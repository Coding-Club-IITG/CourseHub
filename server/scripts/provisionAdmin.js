import "dotenv/config";
import mongoose from "mongoose";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
    AdminProvisioningError,
    provisionAdmin,
    validateAdminCredentials,
} from "../modules/admin/admin.provisioning.js";

export async function main() {
    try {
        // Validate before connecting, so missing credentials cannot trigger writes
        const credentials = validateAdminCredentials({
            userId: process.env.ADMIN_USER_ID,
            password: process.env.ADMIN_PASSWORD,
        });
        const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
        if (!mongoUri) {
            throw new AdminProvisioningError(
                "MISSING_DATABASE",
                "Set MONGO_URI to the intended database before provisioning.",
            );
        }
        await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 10000 });
        const admin = await provisionAdmin(credentials);
        console.log(`Created administrator: ${admin.userId}`);
    } catch (error) {
        console.error(
            error instanceof AdminProvisioningError
                ? error.message
                : "Administrator provisioning failed. Check database availability and the unique userId index.",
        );
        process.exitCode = 1;
    } finally {
        await mongoose.disconnect();
    }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    await main();
}
