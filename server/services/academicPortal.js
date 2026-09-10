import axios from "axios";
import * as cheerio from "cheerio";
import { randomUUID } from "node:crypto";
import AcademicSnapshot from "../modules/academic/academicSnapshot.model.js";
import { acquireStorageLease, releaseStorageLease } from "./storageLeases.js";
import { periodKey, studentRoll } from "./academicPeriod.js";
import { validCourseCode } from "./courseIdentity.js";
import AppError from "../utils/appError.js";

export const academicLimits = {
    responseBytes: 16 * 1024 * 1024,
    snapshotBytes: 8 * 1024 * 1024,
    students: 30000,
    coursesPerStudent: 80,
};
export function academicCacheSeconds() {
    const seconds = Number(process.env.ACADEMIC_CACHE_SECONDS || 86400);
    if (!Number.isSafeInteger(seconds) || seconds < 60 || seconds > 30 * 86400)
        throw new Error("ACADEMIC_CACHE_SECONDS must be between 60 and 2592000");
    return seconds;
}
export function parseAcademicSnapshot(html) {
    if (typeof html !== "string" || Buffer.byteLength(html) > academicLimits.responseBytes)
        throw new AppError(503, "Academic course data is unavailable", "ACADEMIC_INVALID_RESPONSE");
    const $ = cheerio.load(html),
        allotments = {},
        tables = [];
    $("table").each((_, table) => {
        const header = $(table).find("tr").first().find("th,td");
        if (/roll/i.test(header.eq(2).text()) && /course|subject/i.test(header.eq(3).text()))
            tables.push(table);
    });
    if (tables.length !== 1)
        throw new AppError(
            503,
            "Academic course data could not be verified",
            "ACADEMIC_INVALID_RESPONSE",
        );
    $(tables[0])
        .find("tr")
        .slice(1)
        .each((_, row) => {
            const cells = $(row).find("td");
            if (!cells.length || cells.text().trim() === "") return;
            if (
                cells.length === 1 &&
                /^(no (courses|records|allotments)( found)?[.!]?)$/i.test(cells.text().trim())
            )
                return;
            if (cells.length < 4)
                throw new AppError(
                    503,
                    "Academic course data contains an incomplete row",
                    "ACADEMIC_INVALID_RESPONSE",
                );
            let roll, code;
            try {
                const sourceRoll = cells.eq(2).text().trim();
                // The portal also returns X-prefixed identities
                roll = /^X\d{9}$/.test(sourceRoll) ? sourceRoll : studentRoll(sourceRoll);
                code = validCourseCode(cells.eq(3).text().trim());
            } catch {
                throw new AppError(
                    503,
                    "Academic course data contains an invalid row",
                    "ACADEMIC_INVALID_RESPONSE",
                );
            }
            allotments[roll] ||= [];
            // Keep the established non-library SA-course exclusion after normalization.
            if (!code.includes("SA") && !allotments[roll].includes(code))
                allotments[roll].push(code);
            if (allotments[roll].length > academicLimits.coursesPerStudent)
                throw new AppError(
                    503,
                    "Academic course data exceeds the supported limits",
                    "ACADEMIC_INVALID_RESPONSE",
                );
        });
    if (
        Object.keys(allotments).length > academicLimits.students ||
        Buffer.byteLength(JSON.stringify(allotments)) > academicLimits.snapshotBytes
    )
        throw new AppError(
            503,
            "Academic course data exceeds the supported limits",
            "ACADEMIC_INVALID_RESPONSE",
        );
    return allotments;
}

export const academicProvider = {
    async fetch(period) {
        try {
            const response = await axios.post(
                "https://academic.iitg.ac.in/sso/gen/student1.jsp",
                new URLSearchParams({
                    cid: "All",
                    sess: period.session,
                    yr: String(period.year),
                }).toString(),
                {
                    headers: { "Content-Type": "application/x-www-form-urlencoded" },
                    timeout: 30000,
                    signal: AbortSignal.timeout(30000),
                    maxContentLength: academicLimits.responseBytes,
                    maxBodyLength: 1024,
                    maxRedirects: 0,
                },
            );
            return parseAcademicSnapshot(response.data);
        } catch (error) {
            if (error instanceof AppError) throw error;
            throw new AppError(
                503,
                "The academic service is unavailable. Saved courses are preserved.",
                "ACADEMIC_UNAVAILABLE",
            );
        }
    },
};
const pending = new Map();
export async function getAcademicSnapshot(
    period,
    { force = false, requestedAt = new Date(), now = () => new Date() } = {},
) {
    const key = periodKey(period);
    if (pending.has(key)) {
        const underway = pending.get(key),
            result = await underway;
        if (!force || result.fetchedAt >= requestedAt) return result;
        if (pending.get(key) === underway) pending.delete(key);
        return getAcademicSnapshot(period, { force, requestedAt, now });
    }
    const task = (async () => {
        const usable = (value) =>
            value &&
            (force
                ? value.fetchedAt >= requestedAt
                : value.fetchedAt.getTime() > now().getTime() - academicCacheSeconds() * 1000);
        let cached = await AcademicSnapshot.findById(key).lean();
        if (usable(cached)) return cached;
        const owner = randomUUID();
        try {
            await acquireStorageLease(`academic:${key}`, owner, 1, 90000);
        } catch (error) {
            if (error.code === "STORAGE_BUSY")
                throw new AppError(409, "Academic refresh is already in progress", "COURSE_BUSY");
            throw error;
        }
        try {
            cached = await AcademicSnapshot.findById(key).lean();
            if (usable(cached)) return cached;
            const allotments = await academicProvider.fetch(period);
            const snapshot = { ...period, generation: randomUUID(), fetchedAt: now(), allotments };
            await AcademicSnapshot.updateOne({ _id: key }, { $set: snapshot }, { upsert: true });
            return { _id: key, ...snapshot };
        } finally {
            await releaseStorageLease(owner);
        }
    })();
    pending.set(key, task);
    try {
        return await task;
    } finally {
        if (pending.get(key) === task) pending.delete(key);
    }
}
