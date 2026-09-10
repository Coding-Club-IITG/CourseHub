import { randomUUID } from "node:crypto";
import { OperationModel } from "../operation/operation.model.js";
import { listCourses } from "../../services/courseAdministration.js";
import { withRevision } from "../../utils/resourceRevision.js";
import { scheduleCourseRename } from "../../services/courseReferences.js";
import {
    presentCourse,
    requireFile,
    requireFolder,
    courseContext,
    libraryGraph,
} from "../../services/authorization.js";
import { scheduleCourseLink } from "../../services/courseLinking.js";
import { scheduleDeletion } from "../../services/deletions.js";
import { mutateContent } from "../../services/contentMutation.js";
import { presentContribution } from "../contribution/contribution.controller.js";
import AppError from "../../utils/appError.js";
import CourseModel, { FileModel } from "../course/course.model.js";
import { processUploadedCsv } from "../../utils/uploadedCsv.js";
import { safeError } from "../../middleware/requestErrors.js";
import User from "../user/user.model.js";
import Contribution from "../contribution/contribution.model.js";
import { normalizeCourseCode, getCourseCodeCaseInsensitiveRegex } from "../../utils/course.js";
import { scheduleAcademicRefresh } from "../../services/academicSync.js";

export async function getDBCourses(req, res) {
    res.json(await listCourses(req.query));
}
export async function getCourseDashboardData(req, res) {
    const course = await presentCourse(req, req.params.code);
    const codeRegex = getCourseCodeCaseInsensitiveRegex(course.code);
    const studentCount = await User.countDocuments({ "courses.code": codeRegex });
    const graph = await libraryGraph(req);
    const folderIds = [...graph.folderCourses]
        .filter(([, codes]) => codes.has(normalizeCourseCode(course.code)))
        .map(([id]) => id);
    const records = await Contribution.find({ parentFolder: { $in: folderIds } })
        .sort({ createdAt: -1 })
        .populate("files");
    const contributions = await Promise.all(
        records.map((c) => presentContribution(req, c, normalizeCourseCode(course.code))),
    );
    res.json(withRevision({ course, studentCount, contributions }));
}
export async function deleteNode(req, res) {
    if (!["file", "folder"].includes(req.params.type)) throw new AppError(400, "Invalid node type");
    res.status(202).json(
        await scheduleDeletion(req, {
            kind: req.params.type,
            id: req.params.id,
            code: req.body.courseCode,
        }),
    );
}
async function approveContribution(req, res) {
    const { contributionId, action } = req.body;
    if (typeof contributionId !== "string" || !["approve", "reject"].includes(action))
        throw new AppError(400, "Invalid contribution action");
    const code = courseContext(req.body.courseCode);
    const contribution = await Contribution.findOne({ contributionId }).populate("files");
    if (!contribution) throw new AppError(404, "Contribution not found");
    await requireFolder(req, String(contribution.parentFolder), code, "canModerate");
    // Validate the entire stored manifest before the first side effect.
    for (const file of contribution.files)
        await requireFile(req, String(file._id), code, "canModerate");
    await FileModel.updateMany(
        { _id: { $in: contribution.files.map((file) => file._id) } },
        { $set: { isVerified: true } },
    );
    contribution.approved = true;
    await contribution.save();
    res.json({ success: true });
}

export async function handleContribution(req, res) {
    if (
        typeof req.body.contributionId !== "string" ||
        !["approve", "reject"].includes(req.body.action)
    )
        throw new AppError(400, "Invalid contribution action");
    const code = courseContext(req.body.courseCode);
    if (req.body.action === "reject")
        return res.status(202).json(
            await scheduleDeletion(req, {
                kind: "contribution",
                id: req.body.contributionId,
                code,
            }),
        );
    return mutateContent(req, [code], () => approveContribution(req, res));
}

/**
 * Delete a course and remove it from all users' course lists
 */
export async function deleteCourse(req, res) {
    res.status(202).json(await scheduleDeletion(req, { kind: "course", code: req.params.code }));
}

export async function linkLegacyCourse(req, res) {
    res.status(202).json(await scheduleCourseLink(req, req.params.code, req.body.legacyCode));
}

export async function bulkLinkCourses(req, res) {
    const isHeaderValue = (val) => {
        if (!val) return true;
        const norm = normalizeCourseCode(val);
        const headerTerms = [
            "OLDCODE",
            "LEGACYCODE",
            "OLD",
            "LEGACY",
            "SOURCECODE",
            "SOURCE",
            "OLDCOURSECODE",
            "OLDCOURSE",
            "LEGACYCOURSECODE",
            "LEGACYCOURSE",
            "NEWCODE",
            "TARGETCODE",
            "NEW",
            "TARGET",
            "TARGETCOURSECODE",
            "NEWCOURSECODE",
            "NEWCOURSE",
            "TARGETCOURSE",
            "CODE",
            "COURSE",
        ];
        return headerTerms.includes(norm);
    };

    const summary = await processUploadedCsv(req.file, { headers: false }, async (results) => {
        const rows = results
            .map(Object.values)
            .filter((values) => values.some((value) => String(value).trim()));
        if (rows[0]?.length === 2 && rows[0].every(isHeaderValue)) rows.shift();
        if (rows.length > 1000) throw new AppError(413, "Link at most 1,000 rows per CSV file");
        const summary = { scheduled: 0, failed: 0, errors: [], operations: [] };
        for (const values of rows) {
            const oldCode = normalizeCourseCode(values[0] || "");
            const newCode = normalizeCourseCode(values[1] || "");
            if (values.length !== 2 || !oldCode || !newCode) {
                summary.failed++;
                summary.errors.push({
                    oldCode,
                    newCode,
                    error: "Use exactly two nonempty course codes",
                });
                continue;
            }
            try {
                const operation = await scheduleCourseLink(req, newCode, oldCode);
                summary.operations.push({ oldCode, newCode, ...operation });
                summary.scheduled++;
            } catch (err) {
                summary.failed++;
                summary.errors.push({ oldCode, newCode, error: safeError(err).message });
            }
        }

        return summary;
    });
    if (summary.operations.length) {
        summary.receiptId = randomUUID();
        // A completed receipt records scheduling, not completion of the linked jobs.
        await OperationModel.create({
            _id: summary.receiptId,
            kind: "link",
            actorId: req.admin._id,
            actorRole: "admin",
            status: "completed",
            target: { batchLinking: summary },
            plan: { name: "Bulk link scheduling" },
            completedSteps: ["scheduled"],
        });
    }
    res.status(202).json({ message: "Link operations scheduled", summary });
}

export async function syncCoursesCacheController(req, res, next) {
    try {
        res.status(202).json(
            await scheduleAcademicRefresh({ actorId: req.admin._id, actorRole: "admin" }),
        );
    } catch (err) {
        next(err);
    }
}

export async function renameCourse(req, res) {
    res.status(202).json(await scheduleCourseRename(req, req.params.code, req.body));
}
