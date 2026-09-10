import assert from "node:assert/strict";
import mongoose, { Types } from "mongoose";
import Course, { FolderModel, FileModel } from "../../modules/course/course.model.js";
import SearchResults from "../../modules/search/search.model.js";
import User from "../../modules/user/user.model.js";
import BR from "../../modules/br/br.model.js";
import Admin from "../../modules/admin/admin.model.js";
import Contribution from "../../modules/contribution/contribution.model.js";
import CourseAllotment from "../../modules/course/courseAllotment.model.js";
import AcademicSnapshot from "../../modules/academic/academicSnapshot.model.js";
import { OperationModel, CourseLock } from "../../modules/operation/operation.model.js";
import { processOperation } from "../../services/operationWorker.js";
import { academicProvider, getAcademicSnapshot } from "../../services/academicPortal.js";
import { academicPeriod, periodKey, historyPeriods } from "../../services/academicPeriod.js";
import {
    scheduleStudentSync,
    scheduleAcademicRefresh,
    synchronizationStatus,
} from "../../services/academicSync.js";
import {
    readMaintenanceData,
    inventoryData,
    planDataMigration,
    stageContentImport,
    applyMaintenancePlan,
    planDigest,
} from "../../services/dataMaintenance.js";
import { resolveAcademicCodes } from "../../services/courseIdentity.js";
import { sessionHeaders } from "../fixtures/sessions.js";
import { student } from "../fixtures/library.js";

export async function exerciseAcademicReferences(t, origin) {
    const admin = await Admin.findOne(),
        adminHeaders = await sessionHeaders(admin.id, "admin");
    let serial = 0;
    const person = async (fields = {}) =>
        User.create({
            ...student,
            _id: new Types.ObjectId(),
            email: `academic-${++serial}@example.test`,
            rollNumber: 240190000 + serial,
            courses: [],
            ...fields,
        });
    const request = async (url, method, body, status, headers = adminHeaders) => {
        const response = await fetch(origin + url, {
            method,
            headers: { ...headers, "content-type": "application/json" },
            body: body === undefined ? undefined : JSON.stringify(body),
        });
        const data = await response.json();
        assert.equal(response.status, status, JSON.stringify(data));
        return data;
    };
    const run = async (id) => {
        await OperationModel.updateOne({ _id: id }, { $set: { nextRunAt: new Date(0) } });
        assert.equal(await processOperation(id), true);
        return OperationModel.findById(id).lean();
    };
    await t.test(
        "renames update every nested reference, keep resource IDs and preserve old bookmarks",
        async () => {
            const file = await FileModel.create({
                name: "Keep.pdf",
                fileId: "rename-test-file",
                size: "12",
                sizeBytes: 12,
                isVerified: true,
            });
            const folder = await FolderModel.create({
                name: "2026",
                courses: ["REF101"],
                childType: "File",
                children: [file._id],
            });
            const course = await Course.create({
                code: "REF101",
                name: "Before",
                children: [folder._id],
            });
            const user = await person({
                courses: [{ code: "REF101", name: "Before" }],
                previousCourses: [
                    {
                        semester: 1,
                        year: 2024,
                        courses: [
                            { code: "ref 101", name: "Before" },
                            { code: "REF101", name: "Before" },
                        ],
                    },
                ],
                favourites: [
                    { id: file.id, name: "Keep.pdf", code: "REF101", path: "/browse/REF101/2026" },
                ],
            });
            await User.collection.updateOne(
                { _id: user._id },
                { $set: { readOnly: [{ code: " REF101 ", name: "Before" }] } },
            );
            await CourseAllotment.create({
                rollNumber: user.rollNumber,
                ...academicPeriod(),
                courses: ["REF101", "ref101"],
            });
            const contribution = await Contribution.create({
                uploadedBy: user.id,
                courseCode: "REF101",
                parentFolder: folder.id,
                files: [file._id],
            });
            const accepted = await request(
                "/api/admin/course/ref101",
                "PATCH",
                { name: "After", newCode: "REF102" },
                202,
            );
            assert.equal((await run(accepted.operationId)).status, "completed");
            const saved = await User.findById(user.id).lean();
            for (const entry of [
                ...saved.courses,
                ...saved.readOnly,
                ...saved.previousCourses[0].courses,
            ])
                assert.deepEqual(entry, { code: "REF102", name: "After" });
            assert.equal(saved.favourites[0].name, "Keep.pdf");
            assert.equal(saved.favourites[0].path, "/browse/REF102/2026");
            assert.equal((await Contribution.findById(contribution.id)).courseCode, "REF102");
            assert.deepEqual(
                (await CourseAllotment.findOne({ rollNumber: user.rollNumber })).courses,
                ["REF102", "REF102"],
            );
            assert.deepEqual((await FolderModel.findById(folder.id)).courses, ["REF102"]);
            const bookmarked = await request("/api/course/REF101", "GET", undefined, 200);
            assert.equal(bookmarked._id, course.id);
            assert.equal(bookmarked.code, "REF102");
            assert.equal(bookmarked.children[0].children[0]._id, file.id);
            await request("/api/course/create/REF101", "POST", { name: "Must not reuse" }, 409);
        },
    );
    await t.test(
        "rename recovery replays partial reference writes without losing IDs or clearing its lock",
        async (sub) => {
            const course = await Course.create({ code: "REF201", name: "Before" });
            const user = await person({
                courses: [{ code: "REF201", name: "Before" }],
                previousCourses: [{ semester: 1, courses: [{ code: "REF201", name: "Before" }] }],
            });
            const accepted = await request(
                "/api/admin/course/REF201",
                "PATCH",
                { name: "After", newCode: "REF202" },
                202,
            );
            const mock = sub.mock.method(CourseAllotment.collection, "updateMany", () => {
                throw new Error("Injected database interruption");
            });
            const paused = await run(accepted.operationId);
            assert.equal(paused.status, "queued");
            assert.ok(paused.plan);
            assert.ok(await CourseLock.exists({ owner: accepted.operationId }));
            await request("/api/course/REF201", "GET", undefined, 404);
            mock.mock.restore();
            assert.equal((await run(accepted.operationId)).status, "completed");
            assert.equal((await Course.findById(course.id)).code, "REF202");
            assert.equal(
                (await User.findById(user.id)).previousCourses[0].courses[0].code,
                "REF202",
            );
            assert.equal(await CourseLock.countDocuments({ owner: accepted.operationId }), 0);
        },
    );
    await t.test(
        "ambiguous historical shapes and duplicate course identities fail before rename side effects",
        async () => {
            const course = await Course.create({ code: "REF301", name: "Untouched" });
            const user = await person();
            await User.collection.updateOne(
                { _id: user._id },
                { $set: { previousCourses: [{ code: "REF301", name: "Flat history" }] } },
            );
            await request(
                "/api/admin/course/REF301",
                "PATCH",
                { name: "Wrong", newCode: "REF302" },
                409,
            );
            assert.equal((await Course.findById(course.id)).name, "Untouched");
            await User.collection.updateOne({ _id: user._id }, { $set: { previousCourses: [] } });
            await Course.create({ code: "ref 302", name: "Existing populated identity" });
            await request(
                "/api/admin/course/REF301",
                "PATCH",
                { name: "Wrong", newCode: "REF302" },
                409,
            );
        },
    );
    await t.test(
        "self-service synchronization ignores editable role flags, rejects forged targets and deduplicates requests",
        async (sub) => {
            const user = await person({ isBR: true });
            const headers = await sessionHeaders(user.id);
            await request("/api/user/synchronize", "POST", {}, 401, {
                "content-type": "application/json",
            });
            for (const forged of [{ rollNumber: 240101999 }, { force: true }, { userId: admin.id }])
                await request("/api/user/synchronize", "POST", forged, 400, headers);
            sub.mock.method(academicProvider, "fetch", async () => ({
                [user.rollNumber]: ["SYNC101"],
            }));
            await AcademicSnapshot.deleteOne({ _id: periodKey(academicPeriod()) });
            const accepted = await Promise.all(
                [1, 2, 3].map(() => request("/api/user/synchronize", "POST", {}, 202, headers)),
            );
            assert.equal(new Set(accepted.map((op) => op.operationId)).size, 1);
            assert.equal((await run(accepted[0].operationId)).status, "completed");
            const saved = await User.findById(user.id);
            assert.deepEqual(
                saved.courses.map((course) => course.code),
                ["SYNC101"],
            );
            assert.deepEqual(saved.previousCourses, []);
            assert.equal((await synchronizationStatus(saved)).needsSync, false);
            const status = await request(
                `/api/operations/${accepted[0].operationId}`,
                "GET",
                undefined,
                200,
                headers,
            );
            assert.equal(status.synchronization.students, 1);
        },
    );
    await t.test(
        "BR history uses authoritative cached allotments, accepts empty semesters and avoids repeated upstream loads",
        async (sub) => {
            const user = await person({ isBR: false });
            await BR.create({ email: user.email });
            const periods = [...historyPeriods(user.rollNumber), academicPeriod()];
            for (const period of periods)
                await CourseAllotment.create({
                    rollNumber: user.rollNumber,
                    ...period,
                    courses: [],
                    fetchedAt: new Date(),
                });
            sub.mock.method(academicProvider, "fetch", () => {
                throw new Error("Cache should be used");
            });
            const accepted = await scheduleStudentSync(user);
            assert.equal((await run(accepted.operationId)).status, "completed");
            const saved = await User.findById(user.id);
            assert.equal(saved.previousCourses.length, periods.length - 1);
            assert.ok(saved.previousCourses.every((semester) => semester.courses.length === 0));
            assert.equal((await synchronizationStatus(saved)).needsSync, false);
            await BR.deleteOne({ email: user.email });
        },
    );
    await t.test(
        "forced refresh bypasses cache, portal outages preserve snapshots, and retry records success only after persistence",
        async (sub) => {
            const user = await person({
                courses: [{ code: "SYNCOLD", name: "Old" }],
                courseSync: { period: "2020:July-Nov", lastSucceededAt: new Date(0) },
            });
            const period = academicPeriod();
            await CourseAllotment.create({
                rollNumber: user.rollNumber,
                ...period,
                courses: ["SYNCOLD"],
                fetchedAt: new Date(),
            });
            const before = await User.findById(user.id).lean();
            const mock = sub.mock.method(academicProvider, "fetch", () => {
                const error = new Error(
                    "The academic service is unavailable. Saved courses are preserved.",
                );
                error.code = "ACADEMIC_UNAVAILABLE";
                throw error;
            });
            const accepted = await scheduleStudentSync(user, {
                actorId: admin.id,
                actorRole: "admin",
                force: true,
            });
            const paused = await run(accepted.operationId);
            assert.equal(paused.status, "queued");
            assert.equal(paused.plan, undefined);
            assert.equal(
                paused.error.message,
                "The academic service is unavailable. Saved courses are preserved.",
            );
            assert.deepEqual((await User.findById(user.id).lean()).courses, before.courses);
            assert.equal((await User.findById(user.id)).courseSync.lastSucceededAt.getTime(), 0);
            mock.mock.restore();
            sub.mock.method(academicProvider, "fetch", async () => ({
                [user.rollNumber]: ["SYNCNEW"],
            }));
            const write = User.updateOne.bind(User);
            const failure = sub.mock.method(User, "updateOne", (filter, update, ...rest) => {
                if (update.$set?.["courseSync.lastSucceededAt"])
                    throw new Error("Persistence interrupted");
                return write(filter, update, ...rest);
            });
            assert.equal((await run(accepted.operationId)).status, "queued");
            assert.equal((await User.findById(user.id)).courseSync.lastSucceededAt.getTime(), 0);
            failure.mock.restore();
            assert.equal((await run(accepted.operationId)).status, "completed");
            assert.deepEqual(
                (await User.findById(user.id)).courses.map((course) => course.code),
                ["SYNCNEW"],
            );
            const headers = await sessionHeaders(user.id);
            await request(
                `/api/operations/${accepted.operationId}`,
                "GET",
                undefined,
                200,
                headers,
            );
            assert.equal(
                (await synchronizationStatus(await User.findById(user.id))).needsSync,
                false,
            );
        },
    );
    await t.test(
        "bulk academic refresh never assigns prefixed identities to numeric accounts",
        async (sub) => {
            const user = await person();
            await AcademicSnapshot.deleteOne({ _id: periodKey(academicPeriod()) });
            sub.mock.method(academicProvider, "fetch", async () => ({
                [user.rollNumber]: ["PREFIX101"],
                [`X${user.rollNumber}`]: ["PREFIX999"],
            }));
            const accepted = await scheduleAcademicRefresh({
                actorId: admin.id,
                actorRole: "admin",
            });
            const operation = await run(accepted.operationId);
            assert.equal(operation.status, "completed");
            assert.deepEqual(
                (await User.findById(user.id)).courses.map((course) => course.code),
                ["PREFIX101"],
            );
            const snapshot = await AcademicSnapshot.findById(periodKey(academicPeriod())).lean();
            assert.deepEqual(snapshot.allotments[`X${user.rollNumber}`], ["PREFIX999"]);
            assert.equal(await CourseAllotment.countDocuments({ courses: "PREFIX999" }), 0);
            assert.equal(await Course.countDocuments({ code: "PREFIX999" }), 0);
        },
    );
    await t.test(
        "concurrent snapshot requests share one upstream read and execution chooses the current period",
        async (sub) => {
            await AcademicSnapshot.deleteOne({ _id: periodKey(academicPeriod()) });
            let calls = 0;
            sub.mock.method(academicProvider, "fetch", async (period) => {
                calls++;
                assert.deepEqual(period, academicPeriod());
                return {};
            });
            const values = await Promise.all(
                Array.from({ length: 5 }, () => getAcademicSnapshot(academicPeriod())),
            );
            assert.equal(calls, 1);
            assert.equal(new Set(values.map((value) => value.generation)).size, 1);
            const user = await person();
            const accepted = await scheduleStudentSync(user);
            await OperationModel.collection.updateOne(
                { _id: accepted.operationId },
                { $set: { createdAt: new Date("2025-01-01") } },
            );
            assert.equal((await run(accepted.operationId)).plan.period.year, academicPeriod().year);
            assert.equal(
                (await synchronizationStatus(await User.findById(user.id))).needsSync,
                false,
            );
        },
    );
    await t.test(
        "deleted course identities are retired and upstream registrations cannot recreate them",
        async () => {
            const course = await Course.create({
                code: "RETIRED101",
                aliases: ["RETIRED100"],
                name: "Remove empty course",
            });
            const user = await person({
                courses: [{ code: course.code }],
                previousCourses: [{ semester: 1, courses: [{ code: course.code }] }],
            });
            await SearchResults.create({
                code: "RETIRED100",
                name: "Old alias",
                isAvailable: true,
            });
            const accepted = await request(
                `/api/admin/course/${course.code}/delete`,
                "DELETE",
                undefined,
                202,
            );
            assert.equal((await run(accepted.operationId)).status, "completed");
            assert.equal((await resolveAcademicCodes([course.code])).get(course.code), null);
            assert.equal((await SearchResults.findOne({ code: "RETIRED100" })).isAvailable, false);
            assert.equal((await resolveAcademicCodes(["RETIRED100"])).get("RETIRED100"), null);
            const saved = await User.findById(user.id);
            assert.deepEqual(saved.courses, []);
            assert.deepEqual(saved.previousCourses[0].courses, []);
        },
    );

    await t.test(
        "BR assignment queues the shared service and administrator bulk refresh persists current data",
        async (sub) => {
            const user = await person();
            const headers = await sessionHeaders(user.id);
            sub.mock.method(academicProvider, "fetch", async () => ({
                [user.rollNumber]: ["BULKSYNC101"],
            }));
            const assigned = await request("/api/br/create", "POST", { email: user.email }, 201);
            assert.equal(assigned.synchronization.kind, "academic-sync");
            assert.equal((await run(assigned.synchronization.operationId)).status, "completed");
            await request("/api/admin/sync-courses-cache", "POST", {}, 403, headers);
            const accepted = await request("/api/admin/sync-courses-cache", "POST", {}, 202);
            assert.equal((await run(accepted.operationId)).status, "completed");
            const saved = await User.findById(user.id);
            assert.deepEqual(
                saved.courses.map((course) => course.code),
                ["BULKSYNC101"],
            );
            assert.ok(saved.courseSync.lastSucceededAt);
            await request(
                "/api/operations/" + accepted.operationId,
                "GET",
                undefined,
                404,
                headers,
            );
            const scheduled = await scheduleAcademicRefresh();
            assert.equal(
                (await OperationModel.findById(scheduled.operationId)).actorRole,
                "system",
            );
            assert.equal((await run(scheduled.operationId)).status, "completed");
        },
    );
    await t.test(
        "course removal reassigns shared contributions without deleting their identities",
        async () => {
            const user = await person();
            const shared = await FolderModel.create({
                name: "Shared",
                courses: ["SHREF101", "SHREF102"],
                childType: "File",
                children: [],
            });
            await Course.create({ code: "SHREF101", name: "Removing", children: [shared._id] });
            await Course.create({ code: "SHREF102", name: "Remaining", children: [shared._id] });
            const contribution = await Contribution.create({
                uploadedBy: user.id,
                courseCode: "SHREF101",
                parentFolder: shared._id,
                files: [],
            });
            const accepted = await request(
                "/api/admin/course/SHREF101/delete",
                "DELETE",
                undefined,
                202,
            );
            assert.equal((await run(accepted.operationId)).status, "completed");
            assert.equal((await Contribution.findById(contribution.id)).courseCode, "SHREF102");
            assert.deepEqual((await FolderModel.findById(shared.id)).courses, ["SHREF102"]);
        },
    );
    await t.test(
        "inventory is read-only and additive migration resumes after a write without guessing file bytes",
        async () => {
            const folderId = new Types.ObjectId();
            await FolderModel.collection.insertOne({
                _id: folderId,
                name: "2024",
                childType: "File",
                children: [],
                course: "MIG101",
            });
            await Course.create({ code: "MIG101", name: "Migrate", children: [folderId] });
            const data = await readMaintenanceData(),
                database = mongoose.connection.name;
            assert.ok(
                inventoryData(data).findings.some(
                    (finding) =>
                        finding.code === "LEGACY_FOLDER_COURSE" && finding.id === String(folderId),
                ),
            );
            const plan = planDataMigration(data, database);
            assert.ok(plan.steps.some((step) => step.id === String(folderId)));
            assert.equal(
                (await FolderModel.collection.findOne({ _id: folderId })).courses,
                undefined,
            );
            const backup = {
                database,
                reviewed: true,
                sha256: "fixture-backup",
                recoveryProcedure: "Restore the owned fixture database",
                planSha256: planDigest(plan),
            };
            await assert.rejects(
                applyMaintenancePlan(plan, { database, backup: { ...backup, reviewed: false } }),
                { code: "DATA_REVIEW_REQUIRED" },
            );
            await assert.rejects(
                applyMaintenancePlan(plan, {
                    database,
                    backup,
                    checkpoint: async (_, phase) => {
                        if (phase === "after") throw new Error("Restart now");
                    },
                }),
                /Restart now/,
            );
            const result = await applyMaintenancePlan(plan, { database, backup });
            assert.equal(result.status, "completed");
            assert.equal(
                (await applyMaintenancePlan(plan, { database, backup })).status,
                "completed",
            );
            const saved = await FolderModel.collection.findOne({ _id: folderId });
            assert.equal(saved.course, "MIG101");
            assert.deepEqual(saved.courses, ["MIG101"]);
            assert.equal(planDataMigration(await readMaintenanceData(), database).steps.length, 0);
        },
    );
    await t.test(
        "staging preserves populated identities, rejects ambiguous sizes and imports a validated tree idempotently",
        async () => {
            const database = mongoose.connection.name,
                data = await readMaintenanceData();
            const ids = [1, 2, 3].map(() => String(new Types.ObjectId()));
            const manifest = {
                version: 1,
                courses: [{ _id: ids[0], code: "IMPORT101", name: "Imported", children: [ids[1]] }],
                folders: [
                    {
                        _id: ids[1],
                        name: "2024",
                        courses: ["IMPORT101"],
                        childType: "File",
                        children: [ids[2]],
                    },
                ],
                files: [
                    {
                        _id: ids[2],
                        name: "Notes.pdf",
                        fileId: "import-provider-fixture",
                        size: "12",
                        sizeBytes: 12,
                        isVerified: false,
                    },
                ],
            };
            const plan = await stageContentImport(manifest, data, database);
            assert.deepEqual(plan.findings, []);
            const backup = {
                database,
                reviewed: true,
                sha256: "fixture-backup",
                recoveryProcedure: "Restore owned fixtures",
                planSha256: planDigest(plan),
            };
            assert.equal(await Course.findById(ids[0]), null);
            const editedPlan = structuredClone(plan);
            editedPlan.steps[0].document.deletingOperation = "unreviewed-state";
            await assert.rejects(
                applyMaintenancePlan(editedPlan, {
                    database,
                    backup: { ...backup, planSha256: planDigest(editedPlan) },
                }),
                { code: "DATA_REVIEW_REQUIRED" },
            );

            await applyMaintenancePlan(plan, { database, backup });
            await applyMaintenancePlan(plan, { database, backup });
            assert.equal((await Course.findById(ids[0])).children[0].toString(), ids[1]);
            const repeat = await stageContentImport(
                manifest,
                await readMaintenanceData(),
                database,
            );
            assert.deepEqual(repeat.findings, []);
            assert.deepEqual(repeat.steps, []);
            const conflicting = structuredClone(manifest);
            conflicting.courses[0].name = "Overwrite";
            assert.ok(
                (await stageContentImport(conflicting, await readMaintenanceData(), database))
                    .findings.length,
            );
            delete conflicting.files[0].sizeBytes;
            await assert.rejects(stageContentImport(conflicting, data, database), {
                code: "DATA_REVIEW_REQUIRED",
            });
        },
    );
}
