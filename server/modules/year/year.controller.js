import Course from "../course/course.model.js";
import { requireCourse, requireFolder, presentFolder } from "../../services/authorization.js";
import { removeFolderFromCourse } from "../../services/resourceRemoval.js";
import { createYearFolderWithDefaultStructure } from "../course/course.service.js";
import AppError from "../../utils/appError.js";
export async function addYear(req, res) {
    const context = await requireCourse(req, req.body.course, "canManage");
    if (typeof req.body.name !== "string" || !req.body.name.trim())
        throw new AppError(400, "A year name is required");
    const year = await createYearFolderWithDefaultStructure(req.body.name, context.code);
    await Course.updateOne({ _id: context.course._id }, { $addToSet: { children: year._id } });
    req.authorizationGraph = undefined;
    res.json(await presentFolder(req, year._id, context.code));
}
export async function deleteYear(req, res) {
    const context = await requireFolder(req, req.body.folderId, req.body.courseCode, "canManage");
    if (!context.course.children.some((id) => String(id) === String(context.folder._id)))
        throw new AppError(404, "Year not found");
    res.json(await removeFolderFromCourse(req, req.body.folderId, context.code));
}
