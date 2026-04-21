import { FolderModel } from "../course/course.model.js";
import { deleteFile } from "../file/file.controller.js";
import { normalizeCourseCode } from "../../utils/course.js";

async function createFolder(req, res) {
    const { name, course, parentFolder, childType } = req.body;
    const newFolder = await FolderModel.create({
        name,
        courses: [normalizeCourseCode(course)],
        childType,
        children: [],
    });

    if (parentFolder) {
        const parent = await FolderModel.findById(parentFolder);
        parent.children.push(newFolder._id);
        await parent.save();
    }

    return res.json(newFolder);
}

async function deleteFolder(req, res) {
    const { folder, parentFolderId, courseCode } = req.body;
    const folderId = folder._id;
    const normalizedCode = courseCode ? normalizeCourseCode(courseCode) : null;

    try {
        const folderDoc = await FolderModel.findById(folderId);
        
        // If the folder is shared with multiple courses and a specific course requested deletion
        if (folderDoc && folderDoc.courses && folderDoc.courses.length > 1 && normalizedCode) {
            // Option B: Safe Unlinking. Just remove this course's reference from the folder and its descendants
            await removeCourseFromFolderRecursive(folderId, normalizedCode);
            // We DO NOT pull it from parentFolderId.children, because other courses still need it.
            // It will be hidden from the UI via getFolderContent filtering.
        } else {
            // Standard Deletion: It's only used by one course, so safely delete the document entirely
            if (parentFolderId) {
                await FolderModel.findByIdAndUpdate(parentFolderId, {
                    $pull: { children: folderId },
                });
            }
            await recursiveDelete(folder);
        }

        return res.json({ success: true, folderId });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
}

async function removeCourseFromFolderRecursive(folderId, codeToRemove) {
    const folder = await FolderModel.findById(folderId);
    if (!folder) return;

    await FolderModel.updateOne(
        { _id: folderId },
        { $pull: { courses: codeToRemove } }
    );

    if (folder.childType === "Folder") {
        for (const childId of folder.children) {
            await removeCourseFromFolderRecursive(childId, codeToRemove);
        }
    }
}

async function recursiveDelete(folder) {
    if (!folder.children) {
        await FolderModel.findByIdAndDelete(folder._id);
        return;
    }
    if (folder.childType === "Folder") {
        for (const subfolder of folder.children) {
            await recursiveDelete(subfolder);
        }
        await FolderModel.findByIdAndDelete(folder._id);
    }
    else if (folder.childType === "File") {
        for (const file of folder.children) {
            await deleteFile(file);
        }
        await FolderModel.findByIdAndDelete(folder._id);
    }
}

async function getFolderContent(req, res) {
    const { folderId } = req.params;
    const { courseCode } = req.query;
    try {
        const folder = await FolderModel.findById(folderId).populate('children');
        if (!folder) {
            return res.status(404).json({ message: "Folder not found" });
        }
        
        // Filter out shared folders that have been "unlinked" by this specific course
        if (courseCode) {
            const normalizedCode = normalizeCourseCode(courseCode);
            folder.children = folder.children.filter(child => {
                if (child.childType === "Folder") {
                    return child.courses && child.courses.includes(normalizedCode);
                }
                return true; // Keep files, as they are intrinsically shared
            });
        }
        
        return res.json(folder);
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}

async function renameFolder(req, res) {
    const { folderId, newName } = req.body.data;
    try {
        const folder = await FolderModel.findByIdAndUpdate(folderId, { $set: { name: newName } }, { new: true })
        if (!folder) {
            return res.status(404).json({ message: "Folder not found" });
        }
        return res.json(folder);
    }
    catch(err){
        return res.status(500).json({ error: err.message });
    }
}

export { createFolder, deleteFolder, getFolderContent, renameFolder };
