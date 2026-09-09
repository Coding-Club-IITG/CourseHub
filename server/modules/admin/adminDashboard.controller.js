import {
    assertCourseIdentityAvailable,
    validCourseCode,
    codeReferenceRegex,
} from "../../services/courseIdentity.js";
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

// Get all courses from DB
export async function getDBCourses(req, res, next) {
    try {
        const dbCourses = await CourseModel.find({});
        return res.json(dbCourses);
    } catch (err) {
        return next(new AppError(500, "Failed to fetch courses"));
    }
}

// Upload courses via CSV file (comma-separated)
export async function uploadCourses(req, res) {
    const operations = [];
    const allCourses = await processUploadedCsv(req.file, ["code", "name"], async (results) => {
        for (const { code, name } of results) {
            if (!code || !name) continue;
            const codeUpper = validCourseCode(code);
            await mutateContent(req, [codeUpper], async () => {
                const course = await CourseModel.findOne({
                    code: codeReferenceRegex(codeUpper),
                });
                if (!course) {
                    await assertCourseIdentityAvailable(codeUpper);
                    await CourseModel.create({ code: codeUpper, name });
                } else {
                    operations.push(
                        await scheduleCourseRename(req, course.code, { newCode: codeUpper, name }),
                    );
                }
            });
        }
        return CourseModel.find({});
    });
    if (operations.length) return res.status(202).json({ items: allCourses, operations });
    res.json(allCourses);
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
    res.json({ course, studentCount, contributions });
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
        const summary = { scheduled: 0, failed: 0, errors: [], operations: [] };
        for (const row of results) {
            const keys = Object.keys(row);
            if (keys.length === 0) continue;

            let rawOld = "";
            let rawNew = "";

            if (row.oldCode || row.legacyCode || row.old || row.sourceCode) {
                rawOld = row.oldCode || row.legacyCode || row.old || row.sourceCode;
                rawNew = row.newCode || row.targetCode || row.new || row.target;
            } else if (keys.length >= 2) {
                rawOld = row[keys[0]];
                rawNew = row[keys[1]];
            } else if (keys.length === 1 && typeof row[keys[0]] === "string") {
                const parts = row[keys[0]].split(",").map((s) => s.trim());
                if (parts.length >= 2) {
                    rawOld = parts[0];
                    rawNew = parts[1];
                }
            }

            if (!rawOld || !rawNew) continue;

            if (isHeaderValue(rawOld) && isHeaderValue(rawNew)) {
                continue;
            }

            const oldCode = normalizeCourseCode(rawOld);
            const newCode = normalizeCourseCode(rawNew);

            if (!oldCode || !newCode) continue;

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
