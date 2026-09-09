import mongoose, { Schema, model, Types } from "../config/mongoose.js";
import { createHash, randomUUID } from "node:crypto";
import Course, { FolderModel, FileModel } from "../modules/course/course.model.js";
import Contribution from "../modules/contribution/contribution.model.js";
import User from "../modules/user/user.model.js";
import BR from "../modules/br/br.model.js";
import CourseAllotment from "../modules/course/courseAllotment.model.js";
import { buildLibraryGraph } from "./folderTrees.js";
import { validCourseCode, identityLock, assertCourseIdentityAvailable } from "./courseIdentity.js";
import { acquireStorageLease, releaseStorageLease } from "./storageLeases.js";
import { StorageLease } from "../modules/operation/operation.model.js";
import { acquireCourseLocks, releaseCourseLocks } from "./courseLocks.js";
import { normalizeCourseCode } from "../utils/course.js";
import AppError from "../utils/appError.js";

const MaintenanceRun = model(
    "DataMaintenanceRun",
    new Schema(
        {
            _id: String,
            plan: Schema.Types.Mixed,
            digest: String,
            database: String,
            backup: Schema.Types.Mixed,
            completedSteps: { type: [Number], default: [] },
            status: { type: String, enum: ["running", "completed"] },
        },
        { timestamps: true },
    ),
);
const models = {
    courses: Course,
    folders: FolderModel,
    files: FileModel,
    contributions: Contribution,
};
const plain = (value) => JSON.parse(JSON.stringify(value));
const fail = (message) => {
    throw new AppError(409, message, "DATA_REVIEW_REQUIRED");
};
const objectId = (value) => typeof value === "string" && /^[a-f\d]{24}$/i.test(value);
export const planDigest = (plan) => createHash("sha256").update(JSON.stringify(plan)).digest("hex");
const id = (value) => String(value);

export async function readMaintenanceData() {
    const keys = [...Object.keys(models), "users", "brs", "allotments"];
    const sources = [...Object.values(models), User, BR, CourseAllotment];
    const values = await Promise.all(sources.map((source) => source.collection.find({}).toArray()));
    return Object.fromEntries(keys.map((key, index) => [key, plain(values[index])]));
}

export function inventoryData(data) {
    const findings = [];
    const add = (code, collection, record, detail) =>
        findings.push({ code, collection, id: id(record._id), detail });
    const duplicates = (collection, records, key) => {
        const groups = new Map();
        for (const record of records) {
            const value = key(record);
            if (value === undefined || value === "") continue;
            if (!groups.has(value)) groups.set(value, []);
            groups.get(value).push(record);
        }
        for (const group of groups.values())
            if (group.length > 1)
                for (const record of group)
                    add("DUPLICATE_IDENTITY", collection, record, {
                        ids: group.map((entry) => id(entry._id)),
                    });
    };
    const courses = new Map(
        data.courses.map((course) => [normalizeCourseCode(course.code), course]),
    );
    duplicates("courses", data.courses, (course) => normalizeCourseCode(course.code));
    for (const collection of ["users", "brs"])
        duplicates(collection, data[collection], (person) => person.email?.trim().toLowerCase());
    duplicates("users", data.users, (person) => person.rollNumber);
    duplicates(
        "allotments",
        data.allotments,
        (row) => `${row.rollNumber}:${row.year}:${row.session}`,
    );
    const checkCode = (collection, record, raw) => {
        try {
            if (validCourseCode(raw) !== raw)
                add("INCONSISTENT_CODE", collection, record, { code: raw });
        } catch {
            add("INVALID_CODE", collection, record);
            return;
        }
        if (collection !== "courses" && !courses.has(normalizeCourseCode(raw)))
            add("MISSING_COURSE", collection, record, { code: raw });
    };
    for (const course of data.courses) checkCode("courses", course, course.code);
    for (const folder of data.folders) {
        if (Object.hasOwn(folder, "course")) add("LEGACY_FOLDER_COURSE", "folders", folder);
        if (!Array.isArray(folder.courses)) add("MALFORMED_MEMBERSHIP", "folders", folder);
        else folder.courses.forEach((code) => checkCode("folders", folder, code));
    }
    for (const file of data.files) {
        if (Object.hasOwn(file, "course")) add("LEGACY_FILE_COURSE", "files", file);
        if (!Number.isSafeInteger(file.sizeBytes) || file.sizeBytes < 0)
            add("AMBIGUOUS_FILE_SIZE", "files", file, { legacySize: file.size });
        if (
            typeof file.fileId !== "string" ||
            !file.fileId ||
            typeof file.name !== "string" ||
            !file.name ||
            typeof file.isVerified !== "boolean"
        )
            add("MALFORMED_FILE", "files", file);
    }
    for (const user of data.users) {
        for (const field of ["courses", "readOnly", "favourites"]) {
            if (!Array.isArray(user[field])) {
                add("MALFORMED_REFERENCES", "users", user, { field });
                continue;
            }
            for (const entry of user[field]) checkCode("users", user, entry?.code);
        }
        if (
            !Array.isArray(user.previousCourses) ||
            user.previousCourses.some((semester) => !Array.isArray(semester?.courses))
        )
            add("MALFORMED_HISTORY", "users", user);
        else
            for (const semester of user.previousCourses)
                for (const entry of semester.courses) checkCode("users", user, entry?.code);
    }
    for (const row of data.allotments) {
        if (!Array.isArray(row.courses)) add("MALFORMED_REFERENCES", "allotments", row);
        else row.courses.forEach((code) => checkCode("allotments", row, code));
    }
    const graph = buildLibraryGraph(data.courses, data.folders, data.files);
    for (const [code, error] of graph.errors)
        findings.push({
            code: error.code,
            collection: "courses",
            courseCode: code,
            detail: error.message,
        });
    for (const folder of data.folders)
        if (!graph.folderCourses.get(folder._id)?.size)
            add("UNREFERENCED_FOLDER", "folders", folder);
    for (const file of data.files)
        if (!graph.fileCourses.get(file._id)?.size) add("UNREFERENCED_FILE", "files", file);
    const fileIds = new Set(data.files.map((file) => file._id)),
        folderIds = new Set(data.folders.map((folder) => folder._id));
    for (const contribution of data.contributions) {
        if (contribution.courseCode)
            checkCode("contributions", contribution, contribution.courseCode);
        if (
            !folderIds.has(contribution.parentFolder) ||
            !Array.isArray(contribution.files) ||
            contribution.files.some((file) => !fileIds.has(file))
        )
            add("DANGLING_CONTRIBUTION", "contributions", contribution);
    }
    return {
        version: 1,
        counts: Object.fromEntries(
            Object.entries(data).map(([key, records]) => [key, records.length]),
        ),
        findings,
    };
}

export function planDataMigration(data, database) {
    const report = inventoryData(data),
        steps = [];
    // Only add membership when the authoritative tree and the old field agree exactly.
    // IDs, old fields, duplicate identities and ambiguous sizes are never changed here.
    const proposed = plain(data);
    for (const folder of proposed.folders) {
        if ((!folder.courses || folder.courses.length === 0) && typeof folder.course === "string") {
            const code = normalizeCourseCode(folder.course);
            if (data.courses.filter((course) => course.code === code).length === 1)
                folder.courses = [code];
        }
    }
    const graph = buildLibraryGraph(proposed.courses, proposed.folders, proposed.files);
    for (const folder of proposed.folders) {
        const original = data.folders.find((entry) => entry._id === folder._id);
        if (JSON.stringify(original.courses) === JSON.stringify(folder.courses)) continue;
        const members = [...(graph.folderCourses.get(folder._id) || [])];
        if (
            members.length !== 1 ||
            members[0] !== folder.courses[0] ||
            graph.errors.has(members[0])
        )
            continue;
        steps.push({
            collection: "folders",
            type: "membership",
            id: folder._id,
            before: original,
            courses: folder.courses,
        });
    }
    return {
        version: 1,
        id: randomUUID(),
        kind: "migration",
        database,
        steps,
        findings: report.findings,
    };
}

const importFields = {
    courses: ["_id", "code", "name", "children", "books"],
    folders: ["_id", "courses", "name", "childType", "children", "totalFileCount"],
    files: [
        "_id",
        "name",
        "fileId",
        "sizeBytes",
        "size",
        "thumbnail",
        "isVerified",
        "contributorName",
    ],
    contributions: [
        "_id",
        "contributionId",
        "uploadedBy",
        "courseCode",
        "parentFolder",
        "files",
        "approved",
        "description",
    ],
};
export async function stageContentImport(manifest, data, database) {
    if (
        manifest?.version !== 1 ||
        Object.keys(manifest).some((key) => !["version", ...Object.keys(models)].includes(key))
    )
        fail("Use a version 1 content manifest");
    const next = plain(data),
        steps = [],
        findings = [];
    for (const [collection, Model] of Object.entries(models)) {
        const records = manifest[collection] || [];
        if (!Array.isArray(records) || records.length > 10000)
            fail("Manifest collections must be bounded arrays");
        const seen = new Set();
        for (const raw of records) {
            if (
                !raw ||
                Object.keys(raw).some((key) => !importFields[collection].includes(key)) ||
                !objectId(raw._id) ||
                seen.has(raw._id)
            )
                fail("Manifest records require distinct explicit IDs and supported fields");
            seen.add(raw._id);
            if (collection === "courses" && validCourseCode(raw.code) !== raw.code)
                fail("Normalize course codes before staging");
            if (
                collection === "files" &&
                (!Number.isSafeInteger(raw.sizeBytes) ||
                    raw.sizeBytes < 0 ||
                    typeof raw.isVerified !== "boolean")
            )
                fail("File bytes and approval must be explicit; legacy sizes cannot be inferred");
            if (
                collection === "folders" &&
                (!Array.isArray(raw.courses) ||
                    raw.courses.some((code) => validCourseCode(code) !== code))
            )
                fail("Folder membership must be explicit and normalized");
            if (
                collection === "contributions" &&
                (!objectId(raw.uploadedBy) ||
                    !data.users.some((user) => user._id === raw.uploadedBy))
            )
                fail("Contribution ownership must reference an existing student");
            const document = new Model(raw);
            await document.validate();
            const value = plain(document.toObject());
            const existing = data[collection].find((entry) => entry._id === raw._id);
            if (existing) {
                if (
                    Object.keys(raw).some(
                        (key) => JSON.stringify(existing[key]) !== JSON.stringify(raw[key]),
                    )
                )
                    findings.push({ code: "POPULATED_OR_CHANGED_RECORD", collection, id: raw._id });
                continue;
            }
            if (
                collection === "courses" &&
                next.courses.some(
                    (course) =>
                        normalizeCourseCode(course.code) === raw.code ||
                        course.aliases?.includes(raw.code),
                )
            ) {
                findings.push({ code: "COURSE_IDENTITY_CONFLICT", collection, id: raw._id });
                continue;
            }
            next[collection].push(value);
            steps.push({ collection, type: "insert", id: value._id, document: value });
        }
    }
    const graph = buildLibraryGraph(next.courses, next.folders, next.files);
    const codes = new Set(
        steps.filter((step) => step.collection === "courses").map((step) => step.document.code),
    );
    for (const code of codes)
        for (const error of graph.errors.has(code) ? [graph.errors.get(code)] : [])
            findings.push({ code: error.code, courseCode: code, detail: error.message });
    for (const step of steps) {
        if (step.collection === "folders" && !graph.folderCourses.get(step.id)?.size)
            findings.push({ code: "UNREFERENCED_IMPORT", id: step.id });
        if (step.collection === "files" && !graph.fileCourses.get(step.id)?.size)
            findings.push({ code: "UNREFERENCED_IMPORT", id: step.id });
        if (step.collection === "contributions") {
            const contribution = step.document,
                members = graph.folderCourses.get(contribution.parentFolder);
            if (
                !members?.has(contribution.courseCode) ||
                contribution.files.some(
                    (file) => !graph.fileCourses.get(file)?.has(contribution.courseCode),
                )
            )
                findings.push({ code: "INVALID_CONTRIBUTION_CONTEXT", id: step.id });
        }
    }
    // Children are inserted first; course roots are published last. Existing content is never replaced.
    const order = { files: 0, folders: 1, contributions: 2, courses: 3 };
    steps.sort((a, b) => order[a.collection] - order[b.collection]);
    return { version: 1, id: randomUUID(), kind: "import", database, steps, findings };
}

function validatePlan(plan, database) {
    if (
        plan?.version !== 1 ||
        plan.database !== database ||
        !/^[a-f\d-]{36}$/.test(plan.id) ||
        !["migration", "import"].includes(plan.kind) ||
        !Array.isArray(plan.steps) ||
        !Array.isArray(plan.findings) ||
        Buffer.byteLength(JSON.stringify(plan)) > 8 * 1024 * 1024
    )
        fail("Select a valid bounded plan for this exact database");
    if (plan.kind === "import" && plan.findings.length)
        fail("Resolve all staging conflicts before applying an import");
    for (const step of plan.steps) {
        if (
            !models[step.collection] ||
            !objectId(step.id) ||
            (plan.kind === "migration"
                ? step.type !== "membership" || step.collection !== "folders"
                : step.type !== "insert")
        )
            fail("Unsupported maintenance step");
        if (
            step.type === "membership" &&
            (!step.before ||
                !Array.isArray(step.courses) ||
                step.courses.length !== 1 ||
                step.courses.some((code) => validCourseCode(code) !== code))
        )
            fail("Invalid additive membership step");
        if (step.type === "insert" && step.document?._id !== step.id)
            fail("Import identities must match the staged plan");
        if (step.type === "insert") {
            const allowed = [...importFields[step.collection], "aliases", "resourceState"];
            if (
                Object.keys(step.document).some((key) => !allowed.includes(key)) ||
                (step.document.aliases && step.document.aliases.length !== 0) ||
                (step.document.resourceState && step.document.resourceState !== "ready")
            )
                fail("Import plans cannot introduce operation state or unreviewed aliases");
        }
    }
}

async function executeMaintenancePlan(plan, { database, backup, checkpoint = async () => {} }) {
    validatePlan(plan, database);
    if (
        mongoose.connection.name !== database ||
        backup?.database !== database ||
        backup.reviewed !== true ||
        !backup.recoveryProcedure?.trim() ||
        !backup.sha256 ||
        backup.planSha256 !== planDigest(plan)
    )
        fail(
            "Applying requires the exact target, plan digest and a reviewed backup/recovery record",
        );
    const digest = planDigest(plan);
    let run = await MaintenanceRun.findById(plan.id).lean();
    if (run && run.digest !== digest)
        fail("A saved maintenance run cannot be replaced with a different plan");
    if (run?.status === "completed") {
        await releaseCourseLocks(plan.id);
        return run;
    }
    const codes = [
        ...new Set([
            identityLock,
            ...plan.steps.flatMap(
                (step) =>
                    step.courses ||
                    step.document?.courses ||
                    (step.document?.code ? [step.document.code] : []),
            ),
        ]),
    ].sort();
    await acquireCourseLocks(codes, plan.id, { durable: true });
    if (!run) {
        if (plan.kind === "migration") {
            const fresh = planDataMigration(await readMaintenanceData(), database);
            if (
                plan.steps.some(
                    (step) =>
                        !fresh.steps.some(
                            (candidate) => JSON.stringify(candidate) === JSON.stringify(step),
                        ),
                )
            )
                fail(
                    "Migration records changed or the saved plan was edited; create a new dry-run plan",
                );
        }
        // Revalidate the whole import against current data before persisting or executing any step.
        if (plan.kind === "import") {
            const manifest = { version: 1 };
            for (const step of plan.steps) {
                manifest[step.collection] ||= [];
                manifest[step.collection].push(
                    Object.fromEntries(
                        Object.entries(step.document).filter(([key]) =>
                            importFields[step.collection].includes(key),
                        ),
                    ),
                );
            }
            const staged = await stageContentImport(
                manifest,
                await readMaintenanceData(),
                database,
            );
            if (staged.findings.length) {
                await releaseCourseLocks(plan.id);
                fail("The database changed since staging; review a new plan");
            }
            for (const step of plan.steps.filter((entry) => entry.collection === "courses"))
                await assertCourseIdentityAvailable(step.document.code, step.id);
        }
        run = (
            await MaintenanceRun.create({
                _id: plan.id,
                plan,
                digest,
                database,
                backup,
                status: "running",
            })
        ).toObject();
    }
    for (let index = 0; index < run.plan.steps.length; index++) {
        if (run.completedSteps.includes(index)) continue;
        const step = run.plan.steps[index],
            Model = models[step.collection],
            _id = new Types.ObjectId(step.id);
        await checkpoint(index, "before");
        if (step.type === "insert") {
            const current = await Model.collection.findOne({ _id });
            if (!current) await Model.collection.insertOne(new Model(step.document).toObject());
            else
                for (const [key, value] of Object.entries(step.document))
                    if (JSON.stringify(current[key]) !== JSON.stringify(value))
                        fail("An import record changed; restore or review it before resuming");
        } else {
            const current = plain(await Model.collection.findOne({ _id }));
            if (!current) fail("A planned folder is missing");
            if (JSON.stringify(current.courses) !== JSON.stringify(step.courses)) {
                if (JSON.stringify(current) !== JSON.stringify(step.before))
                    fail("A folder changed after the migration was planned");
                const result = await Model.collection.updateOne(
                    {
                        _id,
                        courses:
                            current.courses === undefined ? { $exists: false } : current.courses,
                        course: current.course,
                    },
                    { $set: { courses: step.courses } },
                );
                if (!result.matchedCount) fail("A folder changed during migration");
            }
        }
        await checkpoint(index, "after");
        await MaintenanceRun.updateOne(
            { _id: plan.id, digest },
            { $addToSet: { completedSteps: index } },
        );
    }
    await MaintenanceRun.updateOne({ _id: plan.id, digest }, { $set: { status: "completed" } });
    await releaseCourseLocks(plan.id);
    return MaintenanceRun.findById(plan.id).lean();
}

export async function applyMaintenancePlan(plan, options) {
    const owner = randomUUID();
    await acquireStorageLease("data-maintenance", owner, 1, 60000);
    let lost = false;
    const heartbeat = setInterval(() => {
        StorageLease.updateOne(
            { owner, expiresAt: { $gt: new Date() } },
            { $set: { expiresAt: new Date(Date.now() + 60000) } },
        )
            .then((result) => {
                if (!result.matchedCount) lost = true;
            })
            .catch(() => {
                lost = true;
            });
    }, 15000);
    heartbeat.unref();
    try {
        return await executeMaintenancePlan(plan, {
            ...options,
            checkpoint: async (...args) => {
                if (lost || !(await StorageLease.exists({ owner, expiresAt: { $gt: new Date() } })))
                    fail("Maintenance lease lost; resume the saved plan");
                await options.checkpoint?.(...args);
            },
        });
    } finally {
        clearInterval(heartbeat);
        if (plan?.id && !(await MaintenanceRun.exists({ _id: plan.id, status: "running" })))
            await releaseCourseLocks(plan.id);
        await releaseStorageLease(owner);
    }
}
