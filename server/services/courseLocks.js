import { randomUUID } from "node:crypto";
import { CourseLock } from "../modules/operation/operation.model.js";
import { normalizeCourseCode } from "../utils/course.js";
import AppError from "../utils/appError.js";

export async function acquireCourseLocks(codes, owner, { durable = false } = {}) {
    const sorted = [...new Set(codes.map(normalizeCourseCode))].sort();
    const acquired = [];
    try {
        for (const code of sorted) {
            try {
                await CourseLock.findOneAndUpdate(
                    {
                        _id: code,
                        $or: [{ owner }, { expiresAt: { $lte: new Date() } }],
                    },
                    { $set: { owner, expiresAt: durable ? null : new Date(Date.now() + 120000) } },
                    { upsert: true, returnDocument: "after" },
                );
                acquired.push(code);
            } catch (error) {
                if (error.code === 11000)
                    throw new AppError(
                        409,
                        "A content operation is in progress for this course",
                        "COURSE_BUSY",
                    );
                throw error;
            }
        }
    } catch (error) {
        await CourseLock.deleteMany({ _id: { $in: acquired }, owner });
        throw error;
    }
    return sorted;
}
export const releaseCourseLocks = (owner) => CourseLock.deleteMany({ owner });
export async function assertCourseWritable(code, owner) {
    const lock = await CourseLock.findById(normalizeCourseCode(code)).lean();
    if (lock && lock.owner !== owner && (!lock.expiresAt || lock.expiresAt > new Date()))
        throw new AppError(
            409,
            "A content operation is in progress for this course",
            "COURSE_BUSY",
        );
}

export async function withCourseLocks(
    codes,
    task,
    { owner = randomUUID(), durable = false, retain = false } = {},
) {
    const sorted = await acquireCourseLocks(codes, owner, { durable });
    let lost;
    const assertHeld = async () => {
        if (lost) throw lost;
        const count = await CourseLock.countDocuments({ _id: { $in: sorted }, owner });
        if (count !== sorted.length)
            throw new AppError(409, "Course operation lock was lost", "COURSE_BUSY");
    };
    const heartbeat = durable
        ? undefined
        : setInterval(() => {
              CourseLock.updateMany(
                  { _id: { $in: sorted }, owner },
                  { $set: { expiresAt: new Date(Date.now() + 120000) } },
              )
                  .then((result) => {
                      if (result.matchedCount !== sorted.length)
                          lost = new AppError(409, "Course operation lock was lost", "COURSE_BUSY");
                  })
                  .catch((error) => {
                      lost = error;
                  });
          }, 15000);
    heartbeat?.unref();
    try {
        return await task({ owner, assertHeld });
    } finally {
        clearInterval(heartbeat);
        if (!retain) await releaseCourseLocks(owner);
    }
}
