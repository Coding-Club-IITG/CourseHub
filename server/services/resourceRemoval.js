import { normalizeCourseCode } from "../utils/course.js";
import Course, { FileModel, FolderModel } from "../modules/course/course.model.js";
import Contribution from "../modules/contribution/contribution.model.js";
import { DeleteFile } from "./UploadFile.js";
import { deleteThumbnail } from "./imagekit.js";
import { libraryGraph, requireFolder } from "./authorization.js";

export async function removeFile(file) {
    // Use only the provider identity persisted on this authorized resource
    await DeleteFile(file.fileId);
    if (file.thumbnail?.fileId) {
        await deleteThumbnail(file.thumbnail.fileId).catch((error) => {
            if (error.status !== 404) throw error;
        });
    }
    await FolderModel.updateMany({ children: file._id }, { $pull: { children: file._id } });
    await Contribution.updateMany({ files: file._id }, { $pull: { files: file._id } });
    await FileModel.deleteOne({ _id: file._id });
}

export async function removeFolderFromCourse(req, id, code) {
    const context = await requireFolder(req, id, code, "canManage");
    id = String(context.folder._id);
    const graph = await libraryGraph(req);
    const affected = new Set();
    const collect = (folderId) => {
        folderId = String(folderId);
        if (affected.has(folderId) || !graph.folderCourses.get(folderId)?.has(context.code)) return;
        affected.add(folderId);
        const folder = graph.folders.get(folderId);
        if (folder.childType === "Folder") folder.children.forEach(collect);
    };
    collect(id);
    const removed = [...affected].filter(
        (folderId) =>
            graph.folderCourses.get(folderId).size === 1 &&
            graph.folders
                .get(folderId)
                .courses.every((c) => normalizeCourseCode(c) === context.code),
    );
    const candidateFiles = new Set(
        removed.flatMap((folderId) => {
            const folder = graph.folders.get(folderId);
            return folder.childType === "File" ? folder.children.map(String) : [];
        }),
    );
    // Files referenced by a surviving folder must remain available there
    for (const [folderId, folder] of graph.folders) {
        if (!removed.includes(folderId) && folder.childType === "File")
            folder.children.forEach((fileId) => candidateFiles.delete(String(fileId)));
    }
    const files = await FileModel.find({ _id: { $in: [...candidateFiles] } });
    for (const file of files) await removeFile(file);
    for (const folderId of affected) {
        const folder = graph.folders.get(folderId);
        await FolderModel.updateOne(
            { _id: folderId },
            {
                $set: {
                    courses: folder.courses.filter((c) => normalizeCourseCode(c) !== context.code),
                },
            },
        );
    }
    await Course.updateOne({ _id: context.course._id }, { $pull: { children: id } });
    if (removed.length) {
        await FolderModel.deleteMany({ _id: { $in: removed } });
        await FolderModel.updateMany(
            { children: { $in: removed } },
            { $pull: { children: { $in: removed } } },
        );
    }
    return { success: true, folderId: id, unlinked: context.affectedCourses.length > 1 };
}
