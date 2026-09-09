import { normalizeCourseCode } from "@coursehub/domain";
export { normalizeCourseCode } from "@coursehub/domain";

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import courselist from "../modules/course/course.list.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load list.json once at server startup
let listJsonMap = {};
try {
    const listRaw = fs.readFileSync(
        path.resolve(__dirname, "../modules/course/list.json"),
        "utf-8",
    );
    const parsed = JSON.parse(listRaw);
    for (const [k, v] of Object.entries(parsed)) {
        if (!k) continue;
        listJsonMap[normalizeCourseCode(k)] = v.trim();
    }
} catch (e) {
    // ignore - listJsonMap stays empty, legacy courselist still works
}

/**
 * Unified course title resolver.
 * Priority:
 *   1. list.json  (modern 4-digit codes like "CS3104L")
 *   2. course.list.js legacy 3-digit keys (like "CH 222")
 *   3. "Name Unavailable"
 */
export const getCourseTitle = (code) => {
    if (!code) return "Name Unavailable";
    const norm = normalizeCourseCode(code);

    // 1. Modern list.json lookup
    if (listJsonMap[norm]) return listJsonMap[norm];

    // 2. Legacy 3-digit key fallback (Eg. "CS 03" for old codes)
    const legacy3DigitKey = `${norm.slice(0, 2)} ${norm.slice(-3)}`;
    if (courselist[legacy3DigitKey]) return courselist[legacy3DigitKey];
    if (courselist[norm]) return courselist[norm];

    return "Name Unavailable";
};

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const getCourseCodeCaseInsensitiveRegex = (code) => {
    const normalizedCode = normalizeCourseCode(code);
    return new RegExp(`^${escapeRegex(normalizedCode)}$`, "i");
};
