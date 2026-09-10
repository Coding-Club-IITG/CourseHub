import Papa from "papaparse";
import { normalizeCourseCode, isCourseCode } from "./course.js";

export const importLimits = Object.freeze({
    rows: 1000,
    fileBytes: 1024 * 1024,
    nameLength: 200,
    emailLength: 254,
});

export const normalizeEmail = (value) =>
    typeof value === "string" ? value.trim().toLowerCase() : "";

export const isEmail = (value) =>
    typeof value === "string" &&
    value.length <= importLimits.emailLength &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

export function validateImportRows(type, values) {
    const errors = [],
        rows = [];

    if (!["courses", "brs"].includes(type))
        return { rows, errors: [{ row: 0, message: "Choose courses or BR assignments." }] };
    if (!Array.isArray(values) || !values.length || values.length > importLimits.rows)
        return {
            rows,
            errors: [{ row: 0, message: `Supply between 1 and ${importLimits.rows} rows.` }],
        };

    const seen = new Map();
    values.forEach((value, index) => {
        const row = Number.isSafeInteger(value?.row) && value.row > 0 ? value.row : index + 2;
        let item;
        if (type === "courses") {
            const code = typeof value?.code === "string" ? normalizeCourseCode(value.code) : "",
                name = typeof value?.name === "string" ? value.name.trim() : "";
            if (!isCourseCode(code) || !name || name.length > importLimits.nameLength) {
                errors.push({
                    row,
                    message: `Use a valid course code and a name of 1-${importLimits.nameLength} characters.`,
                });
                return;
            }
            item = { row, code, name };
        } else {
            const email = normalizeEmail(value?.email);
            if (!isEmail(email)) {
                errors.push({
                    row,
                    message: "Enter a valid email address (up to 254 characters).",
                });
                return;
            }
            item = { row, email };
        }

        const key = item.code || item.email,
            previous = seen.get(key);
        if (previous) {
            if (type === "courses" && previous.name !== item.name) {
                errors.push({
                    row,
                    message: `${key} has different names in rows ${previous.row} and ${row}.`,
                });
                return;
            }
            item.duplicateOf = previous.row;
        } else seen.set(key, item);
        rows.push(item);
    });
    return { rows, errors };
}

export function parseImportCsv(text, type) {
    if (
        typeof text !== "string" ||
        new globalThis.TextEncoder().encode(text).byteLength > importLimits.fileBytes
    )
        return {
            rows: [],
            errors: [{ row: 0, message: "Choose a CSV file no larger than 1 MiB." }],
        };

    const columns = type === "courses" ? ["code", "name"] : type === "brs" ? ["email"] : [];
    if (!columns.length) return validateImportRows(type, []);
    const parsed = Papa.parse(text.replace(/^\ufeff/, ""), {
        delimiter: ",",
        skipEmptyLines: false,
        dynamicTyping: false,
    });
    const errors = parsed.errors.map((error) => ({
        row: (error.row ?? 0) + 1,
        message:
            error.code === "MissingQuotes"
                ? "A quoted field is not closed."
                : `Malformed CSV: ${error.message}`,
    }));
    const records = parsed.data
        .map((cells, index) => ({ cells, row: index + 1 }))
        .filter(({ cells }) => cells.some((cell) => cell.trim() !== ""));
    if (!records.length)
        return { rows: [], errors: [{ row: 0, message: "The CSV file is empty." }] };
    const header = records.shift().cells.map((value) => value.trim().toLowerCase());
    if (
        header.length !== columns.length ||
        new Set(header).size !== columns.length ||
        !columns.every((key) => header.includes(key))
    )
        return {
            rows: [],
            errors: [
                ...errors,
                { row: 1, message: `Use exactly these column headers: ${columns.join(", ")}.` },
            ],
        };
    const values = [];
    for (const { cells, row } of records) {
        if (cells.length !== header.length) {
            errors.push({
                row,
                message: `Expected ${header.length} columns; quote any commas inside a value.`,
            });
            continue;
        }
        values.push(
            Object.fromEntries([["row", row], ...header.map((key, index) => [key, cells[index]])]),
        );
    }
    const validated = validateImportRows(type, values);
    return { rows: validated.rows, errors: [...errors, ...validated.errors] };
}
