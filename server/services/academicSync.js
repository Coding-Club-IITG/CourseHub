import { randomUUID } from "node:crypto";
import { Types } from "../config/mongoose.js";
import User from "../modules/user/user.model.js";
import BR from "../modules/br/br.model.js";
import Course from "../modules/course/course.model.js";
import CourseAllotment from "../modules/course/courseAllotment.model.js";
import { OperationModel } from "../modules/operation/operation.model.js";
import {
    academicPeriod,
    periodKey,
    historyPeriods,
    courseSemester,
    studentRoll,
} from "./academicPeriod.js";
import { academicCacheSeconds, getAcademicSnapshot } from "./academicPortal.js";
import {
    resolveAcademicCodes,
    identityLock,
    assertCourseIdentityAvailable,
} from "./courseIdentity.js";
import { acquireCourseLocks } from "./courseLocks.js";
import { journalStep, completeOperation } from "./operationJournal.js";
import { getCourseTitle, normalizeCourseCode } from "../utils/course.js";
import AppError from "../utils/appError.js";

const active = ["planning", "queued", "running"];
const brFor = (user) =>
    BR.exists({ email: user.email.trim().toLowerCase() }).collation({ locale: "en", strength: 2 });
const accepted = (operation) => ({
    operationId: operation._id,
    kind: "academic-sync",
    status: operation.status,
    statusUrl: `/api/operations/${operation._id}`,
});

export async function synchronizationStatus(user, { now = new Date(), isBR } = {}) {
    if (isBR === undefined) isBR = Boolean(await brFor(user));
    const period = periodKey(academicPeriod(now)),
        saved = user.courseSync || {};
    const operation = saved.operationId
        ? await OperationModel.findById(saved.operationId).select("status error").lean()
        : null;
    const needsSync =
        saved.period !== period ||
        (isBR && saved.historyPeriod !== period) ||
        !saved.lastSucceededAt ||
        new Date(saved.lastSucceededAt).getTime() < now.getTime() - academicCacheSeconds() * 1000;
    return {
        state:
            operation && (active.includes(operation.status) || operation.status === "failed")
                ? operation.status
                : saved.lastSucceededAt
                  ? needsSync
                      ? "stale"
                      : "completed"
                  : "never",
        currentPeriod: period,
        period: saved.period,
        lastSucceededAt: saved.lastSucceededAt,
        operationId: saved.operationId,
        needsSync,
        error: operation?.status === "failed" ? operation.error : undefined,
    };
}

export async function scheduleStudentSync(
    user,
    { actorId = user._id, actorRole = "student", force = false } = {},
) {
    studentRoll(user.rollNumber);
    if (force && !["admin", "system"].includes(actorRole))
        throw new AppError(403, "Administrator access is required for an upstream refresh");
    const syncKey = `student:${user._id}:${force ? "force" : "cache"}:${periodKey(academicPeriod())}`;
    let operation = await OperationModel.findOne({ syncKey });
    if (!operation) {
        try {
            operation = await OperationModel.create({
                _id: randomUUID(),
                kind: "academic-sync",
                actorId,
                actorRole,
                syncKey,
                target: {
                    userId: String(user._id),
                    rollNumber: user.rollNumber,
                    force,
                    scope: "student",
                },
                courses: [],
                status: "queued",
            });
        } catch (error) {
            if (error.code !== 11000) throw error;
            operation = await OperationModel.findOne({ syncKey });
        }
    }
    if (!operation) return scheduleStudentSync(user, { actorId, actorRole, force });
    // Retry the saved operation instead of creating a competing writer for this student
    if (operation.status === "failed") {
        await OperationModel.updateOne(
            { _id: operation._id, status: "failed" },
            {
                $set: { status: "queued", attempts: 0, nextRunAt: new Date() },
                $unset: { error: 1 },
            },
        );
        operation.status = "queued";
    }
    await User.updateOne({ _id: user._id }, { $set: { "courseSync.operationId": operation._id } });
    return accepted(operation);
}

export async function scheduleAcademicRefresh({ actorId, actorRole = "system" } = {}) {
    if (!["admin", "system"].includes(actorRole))
        throw new AppError(403, "Administrator access is required");
    const syncKey = `all:${periodKey(academicPeriod())}`;
    let operation = await OperationModel.findOne({ syncKey });
    if (!operation) {
        try {
            operation = await OperationModel.create({
                _id: randomUUID(),
                kind: "academic-sync",
                actorId,
                actorRole,
                syncKey,
                target: { scope: "all", force: true },
                courses: [],
                status: "queued",
            });
        } catch (error) {
            if (error.code !== 11000) throw error;
            operation = await OperationModel.findOne({ syncKey });
        }
    }
    if (operation.status === "failed") {
        await OperationModel.updateOne(
            { _id: operation._id, status: "failed" },
            {
                $set: { status: "queued", attempts: 0, nextRunAt: new Date() },
                $unset: { error: 1 },
            },
        );
        operation.status = "queued";
    }
    return accepted(operation);
}

async function collectStudent(user, operation, period, now) {
    const rollNumber = studentRoll(user.rollNumber),
        history = Boolean(await brFor(user));
    const periods = [...(history ? historyPeriods(rollNumber, period) : []), period];
    const cached = await CourseAllotment.find({ rollNumber }).lean();
    if (new Set(cached.map(periodKey)).size !== cached.length)
        throw new AppError(
            409,
            "Duplicate academic allotments require review",
            "COURSE_REFERENCE_CONFLICT",
        );
    const records = [];
    for (const next of periods) {
        const stored = cached.find(
            (record) => record.year === next.year && record.session === next.session,
        );
        const fresh =
            stored &&
            (periodKey(next) !== periodKey(period) ||
                new Date(stored.fetchedAt || stored.updatedAt || 0).getTime() >
                    now.getTime() - academicCacheSeconds() * 1000);
        if (!operation.target.force && fresh) {
            records.push({
                rollNumber,
                ...next,
                courses: stored.courses,
                fetchedAt: stored.fetchedAt || stored.updatedAt,
            });
        } else {
            const snapshot = await getAcademicSnapshot(next, {
                force: operation.target.force,
                requestedAt: operation.createdAt,
            });
            records.push({
                rollNumber,
                ...next,
                courses: snapshot.allotments[rollNumber] || [],
                fetchedAt: snapshot.fetchedAt,
            });
        }
    }
    return { user, history, records };
}

async function prepareSync(operation, checkpoint) {
    const now = new Date(),
        period = academicPeriod(now);
    let people, records;
    if (operation.target.scope === "student") {
        const user = await User.findById(operation.target.userId).lean();
        if (!user) throw new AppError(404, "Student not found");
        people = [await collectStudent(user, operation, period, now)];
        records = people[0].records;
    } else {
        const snapshot = await getAcademicSnapshot(period, {
            force: true,
            requestedAt: operation.createdAt,
        });
        const users = await User.find()
            .select("_id email rollNumber courses previousCourses readOnly courseSync")
            .lean();
        const rolls = new Set([
            ...Object.keys(snapshot.allotments).map(Number),
            ...users.map((user) => studentRoll(user.rollNumber)),
        ]);
        records = [...rolls].map((rollNumber) => ({
            rollNumber,
            ...period,
            courses: snapshot.allotments[rollNumber] || [],
            fetchedAt: snapshot.fetchedAt,
        }));
        const byRoll = new Map(records.map((record) => [record.rollNumber, record]));
        people = users.map((user) => ({
            user,
            history: false,
            records: [byRoll.get(user.rollNumber)],
        }));
    }
    await checkpoint();
    // External reads happen before taking course locks. Once locked, resolve aliases and save the exact plan.
    await acquireCourseLocks([identityLock], operation._id, { durable: true });
    // The portal request may be slow - retain changes made to Others while it was in flight
    for (const person of people) {
        const current = await User.findById(person.user._id).lean();
        if (!current || current.rollNumber !== person.user.rollNumber)
            throw new AppError(
                409,
                "The student changed during synchronization; retry the refresh",
                "STUDENT_CHANGED",
            );
        person.user = current;
        if (person.history && !(await brFor(current))) person.history = false;
    }
    const resolution = await resolveAcademicCodes(records.flatMap((record) => record.courses));
    const newCourses = new Map();
    const canonical = (record) => ({
        ...record,
        courses: [
            ...new Set(
                record.courses
                    .map((raw) => {
                        const course = resolution.get(normalizeCourseCode(raw));
                        if (!course) return null;
                        if (!course._id && !newCourses.has(course.code))
                            newCourses.set(course.code, {
                                _id: String(new Types.ObjectId()),
                                code: course.code,
                                name: getCourseTitle(course.code),
                                children: [],
                            });
                        return course.code;
                    })
                    .filter(Boolean),
            ),
        ],
    });
    const nextRecords = records.map(canonical);
    const recordMap = new Map(
        nextRecords.map((record) => [`${record.rollNumber}:${periodKey(record)}`, record]),
    );
    const titles = new Map(
        [...resolution.values()]
            .filter(Boolean)
            .map((course) => [course.code, course.name || getCourseTitle(course.code)]),
    );
    const updates = people.map(({ user, history, records: userRecords }) => {
        if (
            !Array.isArray(user.courses) ||
            !Array.isArray(user.previousCourses) ||
            !Array.isArray(user.readOnly) ||
            user.readOnly.some((entry) => !entry || typeof entry.code !== "string") ||
            user.previousCourses.some(
                (semester) =>
                    !Array.isArray(semester?.courses) ||
                    semester.courses.some((entry) => typeof entry?.code !== "string"),
            )
        )
            throw new AppError(
                409,
                "Student course references require review before synchronization",
                "COURSE_REFERENCE_CONFLICT",
            );
        const current = recordMap.get(`${user.rollNumber}:${periodKey(period)}`);
        const savedEntries = [
            ...user.courses,
            ...user.previousCourses.flatMap((semester) =>
                Array.isArray(semester?.courses) ? semester.courses : [],
            ),
        ];
        const present = (codes) =>
            codes.map((code) => ({
                ...savedEntries.find((entry) => entry && normalizeCourseCode(entry.code) === code),
                code,
                name: titles.get(code) || getCourseTitle(code),
            }));
        const previousCourses = history
            ? userRecords
                  .filter((record) => periodKey(record) !== periodKey(period))
                  .map((record) => ({
                      semester: courseSemester(user.rollNumber, record),
                      year: record.year,
                      session: record.session,
                      courses: present(
                          recordMap.get(`${user.rollNumber}:${periodKey(record)}`).courses,
                      ),
                  }))
            : user.previousCourses;
        const registered = new Set([
            ...current.courses,
            ...previousCourses.flatMap((semester) =>
                (semester.courses || []).map((course) => normalizeCourseCode(course.code)),
            ),
        ]);
        return {
            id: String(user._id),
            courses: present(current.courses),
            previousCourses,
            readOnly: user.readOnly.filter(
                (course) => !registered.has(normalizeCourseCode(course.code)),
            ),
            semester: courseSemester(user.rollNumber, period),
            history,
        };
    });
    const courses = [
        ...new Set([
            identityLock,
            ...resolution.keys(),
            ...nextRecords.flatMap((record) => record.courses),
        ]),
    ].sort();
    await acquireCourseLocks(courses, operation._id, { durable: true });
    const plan = {
        period,
        records: nextRecords,
        newCourses: [...newCourses.values()],
        users: updates,
        name:
            operation.target.scope === "all" ? "Academic course refresh" : "Student course refresh",
        affectedCourses: courses.filter((code) => code !== identityLock),
        result: {
            students: updates.length,
            allotments: nextRecords.length,
            createdCourses: newCourses.size,
            message: "Courses synchronized successfully.",
        },
    };
    if (Buffer.byteLength(JSON.stringify(plan)) > 8 * 1024 * 1024)
        throw new AppError(
            409,
            "This synchronization exceeds the supported batch size",
            "SYNC_TOO_LARGE",
        );
    await OperationModel.updateOne({ _id: operation._id }, { $set: { plan, courses } });
    return plan;
}

export async function runAcademicSync(operation, checkpoint) {
    const plan = operation.plan || (await prepareSync(operation, checkpoint));
    const courses = operation.plan
        ? operation.courses
        : (await OperationModel.findById(operation._id).select("courses").lean()).courses;
    await acquireCourseLocks(courses, operation._id, { durable: true });
    const step = journalStep(operation, checkpoint);
    for (const course of plan.newCourses)
        await step(`course:${course._id}`, async () => {
            await assertCourseIdentityAvailable(course.code, course._id);
            await Course.updateOne(
                { _id: course._id },
                { $setOnInsert: course },
                { upsert: true, runValidators: true },
            );
        });
    for (const record of plan.records)
        await step(`allotment:${record.rollNumber}:${periodKey(record)}`, () =>
            CourseAllotment.updateOne(
                { rollNumber: record.rollNumber, year: record.year, session: record.session },
                { $set: { courses: record.courses, fetchedAt: record.fetchedAt } },
                { upsert: true, runValidators: true },
            ),
        );
    for (const user of plan.users)
        await step(`student:${user.id}`, async () => {
            const fields = {
                courses: user.courses,
                readOnly: user.readOnly,
                semester: user.semester,
                "courseSync.period": periodKey(plan.period),
                "courseSync.lastSucceededAt": new Date(),
            };
            if (operation.target.scope === "student")
                fields["courseSync.operationId"] = operation._id;
            if (user.history) {
                fields.previousCourses = user.previousCourses;
                fields["courseSync.historyPeriod"] = periodKey(plan.period);
            }
            await User.updateOne(
                { _id: user.id },
                {
                    $set: fields,
                    ...(operation.target.scope === "all"
                        ? { $unset: { "courseSync.operationId": 1 } }
                        : {}),
                },
                { runValidators: true },
            );
        });
    await completeOperation(operation, checkpoint);
}
