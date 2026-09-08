import { FolderModel } from "../course/course.model.js";
import { requireFolder, presentFolder } from "../../services/authorization.js";
import { removeFolderFromCourse } from "../../services/resourceRemoval.js";
import AppError from "../../utils/appError.js";

export async function createFolder(req, res) {
    const { name, course, parentFolder, childType } = req.body;
    const context = await requireFolder(req, parentFolder, course, "canManage");
    if (
        context.folder.childType !== "Folder" ||
        !["File", "Folder"].includes(childType) ||
        typeof name !== "string" ||
        !name.trim()
    )
        throw new AppError(400, "A name and a valid parent folder are required");
    const folder = await FolderModel.create({
        name: name.trim(),
        courses: context.affectedCourses,
        childType,
        children: [],
    });
    await FolderModel.updateOne({ _id: parentFolder }, { $addToSet: { children: folder._id } });
    req.authorizationGraph = undefined;
    res.json(await presentFolder(req, folder._id, context.code));
}
export async function deleteFolder(req, res) {
    res.json(await removeFolderFromCourse(req, req.body.folderId, req.body.courseCode));
}
export async function getFolderContent(req, res) {
    const context = await requireFolder(req, req.params.folderId, req.query.courseCode);
    res.json(await presentFolder(req, context.folder._id, context.code));
}
export async function renameFolder(req, res) {
    const { folderId, newName, courseCode } = req.body;
    const context = await requireFolder(req, folderId, courseCode, "canManage");
    if (typeof newName !== "string" || !newName.trim() || newName.length > 200)
        throw new AppError(400, "A valid folder name is required");
    await FolderModel.updateOne({ _id: folderId }, { $set: { name: newName.trim() } });
    req.authorizationGraph = undefined;
    res.json(await presentFolder(req, context.folder._id, context.code));
}
