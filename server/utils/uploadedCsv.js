import fs from "node:fs";
import { Writable } from "node:stream";
import { pipeline } from "node:stream/promises";
import csv from "csv-parser";
import AppError from "./appError.js";

export async function processUploadedCsv(file, options, processRows) {
    if (!file) throw new AppError(400, "No file uploaded");
    try {
        const info = await fs.promises.stat(file.path);
        if (info.size > 1024 * 1024)
            throw new AppError(413, "Choose a CSV file no larger than 1 MiB");
        const rows = [];
        await pipeline(
            fs.createReadStream(file.path),
            csv(options),
            new Writable({
                objectMode: true,
                write(row, encoding, done) {
                    rows.push(row);
                    done();
                },
            }),
        );
        return await processRows(rows);
    } finally {
        await fs.promises.unlink(file.path).catch((error) => {
            if (error.code !== "ENOENT") throw error;
        });
    }
}
