import cheerio from "cheerio";

export const normalizeCourseCode = (code) => {
    if (!code) return "";
    return code.toString().toUpperCase().replace(/\s+/g, "");
};

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import courselist from "../modules/course/course.list.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load list.json once at server startup
let listJsonMap = {};
try {
    const listRaw = fs.readFileSync(path.resolve(__dirname, "../modules/course/list.json"), "utf-8");
    const parsed = JSON.parse(listRaw);
    for (const [k, v] of Object.entries(parsed)) {
        if (!k) continue;
        listJsonMap[k.toString().toUpperCase().replace(/\s+/g, "")] = v.trim();
    }
} catch (e) {
    // ignore — listJsonMap stays empty, legacy courselist still works
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

    // 2. Legacy 3-digit key fallback (e.g. "CS 03" for old codes)
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

/**
 * Parses course allotments from the IITG Academic Portal HTML.
 * Supports parsing a specific student's courses or all student allotments at once.
 * 
 * @param {string} htmlData - Raw HTML string from the academic portal
 * @param {string|number} [rollNumber] - Optional. If provided, returns only this student's courses.
 * @returns {Array<{original: string, normalized: string}>|Object<string, string[]>} 
 *          If rollNumber is provided, returns Array of course objects.
 *          If no rollNumber, returns object mapping student roll to array of normalized course codes.
 */
export const parseCourseAllotmentsFromHtml = (htmlData, rollNumber = null) => {
    const $ = cheerio.load(htmlData);
    
    if (rollNumber !== null && rollNumber !== undefined) {
        const targetRollStr = rollNumber.toString().trim();
        const courseCodes = [];
        
        $("tr").each((i, elem) => {
            const details = $(elem).find("td");
            const studentRollNo = details.eq(2).text().trim();
            const rawCode = details.eq(3).text().trim();
            
            if (rawCode && studentRollNo === targetRollStr && !rawCode.includes("SA")) {
                const normalizedCode = normalizeCourseCode(rawCode);
                courseCodes.push({
                    original: rawCode,
                    normalized: normalizedCode,
                });
            }
        });
        
        return courseCodes;
    } else {
        const allotments = {};
        
        $("tr").each((i, elem) => {
            const details = $(elem).find("td");
            const rollStr = details.eq(2).text().trim();
            const rawCode = details.eq(3).text().trim();

            if (rollStr && rawCode && !rawCode.includes("SA")) {
                const roll = parseInt(rollStr);
                if (isNaN(roll)) return;
                const normalizedCode = normalizeCourseCode(rawCode);
                
                if (!allotments[roll]) {
                    allotments[roll] = new Set();
                }
                allotments[roll].add(normalizedCode);
            }
        });
        
        // Convert Sets to Arrays for the returned structure
        const result = {};
        for (const [roll, codeSet] of Object.entries(allotments)) {
            result[roll] = Array.from(codeSet);
        }
        return result;
    }
};

