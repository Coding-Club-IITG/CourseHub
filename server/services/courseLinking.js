import { randomUUID } from "node:crypto";
import { Types } from "mongoose";
import Course, { FolderModel } from "../modules/course/course.model.js";
import { OperationModel } from "../modules/operation/operation.model.js";
import { actorFor, courseContext, libraryGraph } from "./authorization.js";
import { relatedCourses } from "./contentMutation.js";
import { acquireCourseLocks, releaseCourseLocks } from "./courseLocks.js";
import {
    walkFolderTree,
    assertValidCourseTree,
    treeId,
    validateTreeChange,
    treeCodes,
} from "./folderTrees.js";
import { journalStep, completeOperation } from "./operationJournal.js";
import { getCourseTitle, normalizeCourseCode } from "../utils/course.js";
import AppError from "../utils/appError.js";

const yearName = (folder) =>
    typeof folder.name === "string" ? folder.name.trim().toLowerCase() : "";
const accepted = (operation) => ({
    operationId: operation._id,
    kind: "link",
    status: operation.status,
    statusUrl: `/api/operations/${operation._id}`,
});

export function planCourseLink(graph, sourceCode, targetCode) {
    assertValidCourseTree(graph, sourceCode);
    assertValidCourseTree(graph, targetCode);
    const source = graph.courses.get(sourceCode),
        target = graph.courses.get(targetCode);
    if (!source || source.deletingOperation) throw new AppError(404, "Source course not found");
    if (target?.deletingOperation)
        throw new AppError(409, "Target course cleanup is in progress", "COURSE_BUSY");
    const byName = (course, code) => {
        const groups = new Map();
        for (const id of new Set((course?.children || []).map(treeId))) {
            if (!graph.folderCourses.get(id)?.has(code)) continue;
            const folder = graph.folders.get(id),
                name = yearName(folder);
            if (!name)
                throw new AppError(
                    409,
                    "A year without a name requires repair",
                    "TREE_INVALID_STRUCTURE",
                );
            if (!groups.has(name)) groups.set(name, []);
            groups.get(name).push(folder);
        }
        return groups;
    };
    const sourceYears = byName(source, sourceCode),
        targetYears = byName(target, targetCode);
    const result = {
        sourceCode,
        targetCode,
        linked: [],
        alreadyLinked: [],
        replaced: [],
        conflicts: [],
    };
    const additions = new Set(),
        detachments = new Set();
    let roots = [...new Set((target?.children || []).map(treeId))];
    const subtree = (id, code) => walkFolderTree(graph, [id], code);
    for (const [name, sources] of sourceYears) {
        const targets = targetYears.get(name) || [];
        const conflict = (reason) =>
            result.conflicts.push({
                year: sources[0].name,
                reason,
                sourceIds: sources.map(treeId),
                targetIds: targets.map(treeId),
            });
        if (sources.length !== 1) {
            conflict("Multiple source years have this name; all were preserved.");
            continue;
        }
        const sourceYear = sources[0],
            sourceId = treeId(sourceYear);
        const others = targets.filter((folder) => treeId(folder) !== sourceId);
        const populated = others.filter((folder) => subtree(folder._id, targetCode).files.size > 0);
        if (targets.some((folder) => treeId(folder) === sourceId)) {
            result.alreadyLinked.push({ year: sourceYear.name, id: sourceId });
            if (populated.length) conflict("Populated duplicate target years were preserved.");
            // Existing links do not silently re-share descendants previously unlinked from the target
            continue;
        }
        if (populated.length) {
            conflict("The target has content in this year; its files and folders were preserved.");
            continue;
        }
        for (const folder of targets) {
            const id = treeId(folder);
            for (const child of subtree(id, targetCode).folders) detachments.add(child);
            roots = roots.filter((root) => root !== id);
            result.replaced.push({ year: folder.name, id });
        }
        for (const id of subtree(sourceId, sourceCode).folders) additions.add(id);
        if (!roots.includes(sourceId)) roots.push(sourceId);
        result.linked.push({ year: sourceYear.name, id: sourceId });
    }
    // Duplicate target years without a source match still need explicit reporting.
    for (const [name, targets] of targetYears) {
        if (sourceYears.has(name) || targets.length < 2) continue;
        if (targets.some((folder) => subtree(folder._id, targetCode).files.size))
            result.conflicts.push({
                year: targets[0].name,
                reason: "Populated duplicate target years were preserved.",
                sourceIds: [],
                targetIds: targets.map(treeId),
            });
    }
    // Keep membership where a retained target root still reaches an empty shared descendant
    const retained = walkFolderTree(
        graph,
        roots.filter((id) => !result.linked.some((year) => year.id === id)),
        targetCode,
    );
    for (const id of retained.folders) detachments.delete(id);
    for (const id of additions) detachments.delete(id);
    const plan = {
        name: `${sourceCode} → ${targetCode}`,
        sourceCode,
        targetCode,
        targetId: target ? treeId(target) : String(new Types.ObjectId()),
        targetName: target?.name || getCourseTitle(targetCode),
        createTarget: !target,
        roots,
        addMembership: [...additions],
        removeMembership: [...detachments],
        detachedFolders: [...detachments].map((id) => ({
            id,
            remaining: graph.folders
                .get(id)
                .courses.filter((code) => normalizeCourseCode(code) !== targetCode),
        })),
        result,
    };
    validateTreeChange(
        graph,
        {
            folders: [...new Set([...additions, ...detachments])].map((id) => ({
                ...graph.folders.get(id),
                courses: additions.has(id)
                    ? [...new Set([...treeCodes(graph.folders.get(id).courses), targetCode])]
                    : treeCodes(graph.folders.get(id).courses).filter(
                          (code) => code !== targetCode,
                      ),
            })),
            courses: [{ ...(target || { _id: plan.targetId, code: targetCode }), children: roots }],
        },
        [targetCode],
    );
    if (JSON.stringify(plan).length > 8 * 1024 * 1024)
        throw new AppError(409, "Link fewer years at a time", "OPERATION_TOO_LARGE");
    return plan;
}

export async function prepareLink(operation, req = {}) {
    await acquireCourseLocks(operation.courses, operation._id, { durable: true });
    const persisted =
        operation.plan ||
        (await OperationModel.findById(operation._id).select("plan").lean())?.plan;
    if (persisted) return persisted;
    req.authorizationGraph = undefined;
    const related = await relatedCourses(req, [operation.target.code, operation.target.sourceCode]);
    if (related.some((code) => !operation.courses.includes(code)))
        throw new AppError(409, "Course sharing changed; review the link again", "SHARING_CHANGED");
    const plan = planCourseLink(
        await libraryGraph(req),
        operation.target.sourceCode,
        operation.target.code,
    );
    plan.affectedCourses = [...operation.courses];
    await OperationModel.updateOne(
        { _id: operation._id, plan: { $exists: false } },
        { $set: { plan, status: "queued" } },
    );
    return (await OperationModel.findById(operation._id).select("plan").lean()).plan;
}

export async function scheduleCourseLink(req, targetValue, sourceValue) {
    const actor = await actorFor(req);
    if (!actor.admin) throw new AppError(403, "Administrator access is required");
    req.authorizationGraph = undefined;
    const targetCode = courseContext(targetValue),
        sourceCode = courseContext(sourceValue);
    if (targetCode === sourceCode)
        throw new AppError(400, "Source and target courses must be different");
    const requestKey = `link:${sourceCode}:${targetCode}`;
    const previous = await OperationModel.findOne({ actorId: actor.id, requestKey });
    if (previous) return accepted(previous);
    const courses = await relatedCourses(req, [sourceCode, targetCode]);
    // Validate before creating an operation, then re-read under the durable locks
    planCourseLink(await libraryGraph(req), sourceCode, targetCode);
    let operation;
    try {
        operation = await OperationModel.create({
            _id: randomUUID(),
            kind: "link",
            actorId: actor.id,
            actorRole: "admin",
            requestKey,
            target: { code: targetCode, sourceCode },
            courses,
            status: "planning",
        });
    } catch (error) {
        if (error.code !== 11000) throw error;
        return accepted(await OperationModel.findOne({ actorId: actor.id, requestKey }));
    }
    try {
        await prepareLink(operation, req);
    } catch (error) {
        if (error.code === "COURSE_BUSY") return accepted(operation);
        const current = await OperationModel.findById(operation._id);
        if (!current.plan) {
            await OperationModel.updateOne(
                { _id: operation._id },
                {
                    $set: {
                        status: "failed",
                        error: {
                            code: error.code || "LINK_FAILED",
                            message: "Linking could not be prepared",
                        },
                    },
                    $unset: { requestKey: 1 },
                },
            );
            await releaseCourseLocks(operation._id);
        }
        throw error;
    }
    return accepted(await OperationModel.findById(operation._id));
}

export async function runCourseLink(operation, checkpoint) {
    const plan = operation.plan || (await prepareLink(operation));
    await acquireCourseLocks(operation.courses, operation._id, { durable: true });
    const step = journalStep(operation, checkpoint);
    await step("target", async () => {
        if (plan.createTarget)
            await Course.updateOne(
                { _id: plan.targetId },
                { $setOnInsert: { code: plan.targetCode, name: plan.targetName, children: [] } },
                { upsert: true },
            );
    });
    await step("memberships", async () => {
        const result = await FolderModel.updateMany(
            { _id: { $in: plan.addMembership } },
            { $addToSet: { courses: plan.targetCode } },
        );
        if (result.matchedCount !== plan.addMembership.length)
            throw new AppError(
                409,
                "A planned folder is missing. Repair the saved references before retrying.",
                "LINK_REFERENCES_CHANGED",
            );
    });
    await step("roots", async () => {
        const result = await Course.updateOne(
            { _id: plan.targetId },
            { $set: { children: plan.roots } },
        );
        if (!result.matchedCount)
            throw new AppError(
                409,
                "The planned target course is missing. Restore it before retrying.",
                "LINK_TARGET_MISSING",
            );
    });
    await step("detach", async () => {
        for (const folder of plan.detachedFolders) {
            const result = await FolderModel.updateOne(
                { _id: folder.id },
                { $set: { courses: folder.remaining } },
            );
            if (!result.matchedCount)
                throw new AppError(
                    409,
                    "A replaced folder is missing. Repair the saved references before retrying.",
                    "LINK_REFERENCES_CHANGED",
                );
        }
    });
    await completeOperation(operation, checkpoint);
}
