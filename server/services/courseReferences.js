import { createHash, randomUUID } from "node:crypto";
import User from "../modules/user/user.model.js";
import Course, { FolderModel } from "../modules/course/course.model.js";
import Contribution from "../modules/contribution/contribution.model.js";
import CourseAllotment from "../modules/course/courseAllotment.model.js";
import SearchResults from "../modules/search/search.model.js";
import { OperationModel } from "../modules/operation/operation.model.js";
import { actorFor, requireCourse } from "./authorization.js";
import { relatedCourses } from "./contentMutation.js";
import { acquireCourseLocks } from "./courseLocks.js";
import { journalStep, completeOperation } from "./operationJournal.js";
import {
    identityLock,
    codeReferenceRegex,
    validCourseCode,
    assertCourseIdentityAvailable,
    rememberCourseCodes,
} from "./courseIdentity.js";
import { normalizeCourseCode } from "../utils/course.js";
import AppError from "../utils/appError.js";

export function renameCoursePath(path, oldCode, newCode) {
    if (typeof path !== "string") return path;
    return path
        .split("/")
        .map((segment) => {
            try {
                return normalizeCourseCode(decodeURIComponent(segment)) === oldCode
                    ? newCode
                    : segment;
            } catch {
                return segment;
            }
        })
        .join("/");
}

export async function assertCourseReferenceShapes(code) {
    const match = codeReferenceRegex(code);
    if (
        await User.collection.findOne({ "previousCourses.code": match }, { projection: { _id: 1 } })
    )
        throw new AppError(
            409,
            "A flat course-history record needs review before this course can change",
            "COURSE_REFERENCE_CONFLICT",
        );
}

export async function updateCourseReferences({
    oldCode,
    newCode,
    name,
    remove = false,
    sharedFolders = [],
}) {
    const match = codeReferenceRegex(oldCode);
    for (const field of ["courses", "readOnly"]) {
        await User.collection.updateMany(
            { [`${field}.code`]: match },
            remove
                ? { $pull: { [field]: { code: match } } }
                : {
                      $set: {
                          [`${field}.$[course].code`]: newCode,
                          [`${field}.$[course].name`]: name,
                      },
                  },
            remove ? {} : { arrayFilters: [{ "course.code": match }] },
        );
    }
    await User.collection.updateMany(
        { "previousCourses.courses.code": match },
        remove
            ? { $pull: { "previousCourses.$[semester].courses": { code: match } } }
            : {
                  $set: {
                      "previousCourses.$[semester].courses.$[course].code": newCode,
                      "previousCourses.$[semester].courses.$[course].name": name,
                  },
              },
        {
            arrayFilters: [
                { "semester.courses": { $type: "array" } },
                ...(remove ? [] : [{ "course.code": match }]),
            ],
        },
    );
    if (remove) {
        await User.collection.updateMany(
            { "favourites.code": match },
            { $pull: { favourites: { code: match } } },
        );
    } else {
        // Paths vary by resource: only matching favourites are read, and each write matches its old path
        for await (const user of User.collection.find(
            { "favourites.code": match },
            { projection: { favourites: 1 } },
        )) {
            for (const favourite of user.favourites || []) {
                if (!match.test(favourite?.code)) continue;
                const fields = { "favourites.$[favourite].code": newCode };
                if (typeof favourite.path === "string")
                    fields["favourites.$[favourite].path"] = renameCoursePath(
                        favourite.path,
                        oldCode,
                        newCode,
                    );
                await User.collection.updateOne(
                    { _id: user._id },
                    { $set: fields },
                    {
                        arrayFilters: [
                            {
                                "favourite.code": match,
                                ...(typeof favourite.path === "string"
                                    ? { "favourite.path": favourite.path }
                                    : {}),
                            },
                        ],
                    },
                );
            }
        }
    }
    await CourseAllotment.collection.updateMany(
        { courses: match },
        remove ? { $pull: { courses: match } } : { $set: { "courses.$[code]": newCode } },
        remove ? {} : { arrayFilters: [{ code: match }] },
    );
    if (remove) {
        for (const folder of sharedFolders) {
            const code = folder.remaining.map(normalizeCourseCode).sort()[0];
            if (code)
                await Contribution.updateMany(
                    { courseCode: match, parentFolder: folder.id },
                    { $set: { courseCode: code } },
                );
        }
        // Remaining orphaned contributions keep their identity, files and ownership, without a stale course label
        await Contribution.updateMany({ courseCode: match }, { $unset: { courseCode: 1 } });
        await SearchResults.updateMany({ code: match }, { $set: { isAvailable: false } });
    } else {
        await Contribution.updateMany({ courseCode: match }, { $set: { courseCode: newCode } });
        // Search rows are a derived catalogue, not content identities
        await SearchResults.updateMany({ code: match }, { $set: { name, isAvailable: true } });
        await SearchResults.updateOne(
            { code: newCode },
            { $set: { name, isAvailable: true } },
            { upsert: true },
        );
    }
}

export async function removeCourseReferences(plan) {
    const codes = plan.identityCodes || [plan.code];
    for (const code of codes) await assertCourseReferenceShapes(code);
    await rememberCourseCodes(plan.courseId, codes, true);
    for (const code of codes)
        await updateCourseReferences({
            oldCode: code,
            remove: true,
            sharedFolders: plan.foldersToUnlink,
        });
}

export async function scheduleCourseRename(
    req,
    value,
    { name, newCode } = {},
    { operationId } = {},
) {
    const actor = await actorFor(req);
    if (!actor.admin) throw new AppError(403, "Administrator access is required");
    if (typeof name !== "string" || !name.trim() || name.trim().length > 200)
        throw new AppError(
            400,
            "A course name of up to 200 characters is required",
            "VALIDATION_FAILED",
        );
    if (operationId) {
        const existing = await OperationModel.findById(operationId);
        if (existing) {
            if (existing.kind !== "rename" || String(existing.actorId) !== actor.id)
                throw new AppError(
                    409,
                    "Import row operation does not match",
                    "IMPORT_OPERATION_CONFLICT",
                );
            return {
                operationId: existing._id,
                kind: "rename",
                status: existing.status,
                statusUrl: "/api/operations/" + existing._id,
            };
        }
    }
    const context = await requireCourse(req, value, "canManage");
    newCode = newCode === undefined ? context.code : validCourseCode(newCode);
    await assertCourseIdentityAvailable(newCode, context.course._id);
    await assertCourseReferenceShapes(context.code);
    const target = {
        courseId: String(context.course._id),
        code: context.code,
        newCode,
        name: name.trim(),
    };
    const requestKey = operationId
        ? "import-rename:" + operationId
        : "rename:" + createHash("sha256").update(JSON.stringify(target)).digest("hex");
    const fields = {
        _id: operationId || randomUUID(),
        kind: "rename",
        actorId: actor.id,
        actorRole: "admin",
        requestKey,
        target,
        courses: [
            ...new Set([identityLock, newCode, ...(await relatedCourses(req, [context.code]))]),
        ].sort(),
        status: "queued",
    };
    let operation;
    try {
        operation = await OperationModel.create(fields);
    } catch (error) {
        if (error.code !== 11000) throw error;
        operation = await OperationModel.findOne({ actorId: actor.id, requestKey });
    }
    return {
        operationId: operation._id,
        kind: "rename",
        status: operation.status,
        statusUrl: `/api/operations/${operation._id}`,
    };
}

export async function runCourseRename(operation, checkpoint) {
    await acquireCourseLocks(operation.courses, operation._id, { durable: true });
    let plan = operation.plan;
    if (!plan) {
        await checkpoint();
        const course = await Course.findById(operation.target.courseId).lean();
        if (!course || course.deletingOperation) throw new AppError(404, "Course not found");
        const related = await relatedCourses({}, [course.code]);
        if (related.some((code) => !operation.courses.includes(code)))
            throw new AppError(
                409,
                "Shared course membership changed; review the edit again",
                "COURSE_CHANGED",
            );
        await assertCourseIdentityAvailable(operation.target.newCode, course._id);
        await assertCourseReferenceShapes(course.code);
        if (normalizeCourseCode(course.code) !== operation.target.code)
            throw new AppError(
                409,
                "The course changed; review the requested edit again",
                "COURSE_CHANGED",
            );
        const active = await OperationModel.exists({
            _id: { $ne: operation._id },
            kind: { $in: ["upload", "delete", "link"] },
            courses: { $in: operation.courses.filter((code) => code !== identityLock) },
            status: { $nin: ["completed", "cancelled"] },
        });
        if (active)
            throw new AppError(
                409,
                "Finish or cancel pending content operations before editing this course",
                "COURSE_OPERATIONS_PENDING",
            );
        plan = {
            ...operation.target,
            oldCode: normalizeCourseCode(course.code),
            aliases: [
                ...new Set([...(course.aliases || []), normalizeCourseCode(course.code)]),
            ].filter((code) => code !== operation.target.newCode),
            affectedCourses: operation.courses.filter((code) => code !== identityLock),
        };
        await OperationModel.updateOne({ _id: operation._id }, { $set: { plan } });
    }
    const step = journalStep(operation, checkpoint);
    await step("mark", () =>
        Course.updateOne({ _id: plan.courseId }, { $set: { changingOperation: operation._id } }),
    );
    await step("identities", () =>
        rememberCourseCodes(plan.courseId, [plan.oldCode, plan.newCode, ...plan.aliases]),
    );
    await step("references", () =>
        updateCourseReferences({ oldCode: plan.oldCode, newCode: plan.newCode, name: plan.name }),
    );
    await step("folders", () =>
        FolderModel.collection.updateMany(
            { courses: codeReferenceRegex(plan.oldCode) },
            { $set: { "courses.$[code]": plan.newCode } },
            { arrayFilters: [{ code: codeReferenceRegex(plan.oldCode) }] },
        ),
    );
    await step("course", () =>
        Course.updateOne(
            { _id: plan.courseId, changingOperation: operation._id },
            {
                $set: { code: plan.newCode, name: plan.name, aliases: plan.aliases },
                $unset: { changingOperation: 1 },
            },
        ),
    );
    await completeOperation(operation, checkpoint);
}
