import { FolderModel } from "../course/course.model.js";
import { requireFolder, presentFolder, libraryGraph } from "../../services/authorization.js";
import { validateTreeChange } from "../../services/folderTrees.js";
import { scheduleDeletion } from "../../services/deletions.js";
import { mutateContent } from "../../services/contentMutation.js";
import AppError from "../../utils/appError.js";

async function createFolderAction(req, res) {
    const { name, course, parentFolder, childType } = req.body;
    const context = await requireFolder(req, parentFolder, course, "canManage");
    if (
        context.folder.childType !== "Folder" ||
        !["File", "Folder"].includes(childType) ||
        typeof name !== "string" ||
        !name.trim() ||
        name.length > 200
    )
        throw new AppError(400, "A name and a valid parent folder are required");
    const folder = new FolderModel({
        name: name.trim(),
        courses: context.affectedCourses,
        childType,
        children: [],
    });
    validateTreeChange(
        await libraryGraph(req),
        {
            folders: [
                folder.toObject(),
                { ...context.folder, children: [...context.folder.children, folder._id] },
            ],
        },
        context.affectedCourses,
    );
    await folder.save();
    await FolderModel.updateOne({ _id: parentFolder }, { $addToSet: { children: folder._id } });
    req.authorizationGraph = undefined;
    res.json(await presentFolder(req, folder._id, context.code));
}
export async function deleteFolder(req, res) {
    res.status(202).json(
        await scheduleDeletion(req, {
            kind: "folder",
            id: req.body.folderId,
            code: req.body.courseCode,
        }),
    );
}
export async function getFolderContent(req, res) {
    const context = await requireFolder(req, req.params.folderId, req.query.courseCode);
    res.json(await presentFolder(req, context.folder._id, context.code));
}
async function renameFolderAction(req, res) {
    const { folderId, newName, courseCode } = req.body;
    const context = await requireFolder(req, folderId, courseCode, "canManage");
    if (typeof newName !== "string" || !newName.trim() || newName.length > 200)
        throw new AppError(400, "A valid folder name is required");
    await FolderModel.updateOne({ _id: folderId }, { $set: { name: newName.trim() } });
    req.authorizationGraph = undefined;
    res.json(await presentFolder(req, context.folder._id, context.code));
}

export async function createFolder(req, res) {
    const context = await requireFolder(req, req.body.parentFolder, req.body.course, "canManage");
    return mutateContent(req, context.affectedCourses || [context.code], () =>
        createFolderAction(req, res),
    );
}

export async function renameFolder(req, res) {
    const context = await requireFolder(req, req.body.folderId, req.body.courseCode, "canManage");
    return mutateContent(req, context.affectedCourses || [context.code], () =>
        renameFolderAction(req, res),
    );
}
