import Course from "../course/course.model.js";
import { requireCourse, presentFolder } from "../../services/authorization.js";
import { scheduleDeletion } from "../../services/deletions.js";
import { mutateContent } from "../../services/contentMutation.js";
import { createYearFolderWithDefaultStructure } from "../course/course.service.js";
import AppError from "../../utils/appError.js";
async function addYearAction(req, res) {
    const context = await requireCourse(req, req.body.course, "canManage");
    if (typeof req.body.name !== "string" || !req.body.name.trim())
        throw new AppError(400, "A year name is required");
    const year = await createYearFolderWithDefaultStructure(req.body.name, context.code);
    await Course.updateOne({ _id: context.course._id }, { $addToSet: { children: year._id } });
    req.authorizationGraph = undefined;
    res.json(await presentFolder(req, year._id, context.code));
}
export async function deleteYear(req, res) {
    res.status(202).json(
        await scheduleDeletion(req, {
            kind: "folder",
            id: req.body.folderId,
            code: req.body.courseCode,
            rootOnly: true,
        }),
    );
}

export async function addYear(req, res) {
    const context = await requireCourse(req, req.body.course, "canManage");
    return mutateContent(req, context.affectedCourses || [context.code], () =>
        addYearAction(req, res),
    );
}
