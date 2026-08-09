import { FolderModel } from "../course/course.model.js";
import CourseModel from "../course/course.model.js";
import { deleteFile } from "../file/file.controller.js";
import { normalizeCourseCode, getCourseCodeCaseInsensitiveRegex } from "../../utils/course.js";
import { createYearFolderWithDefaultStructure } from "../course/course.service.js";

async function addYear(req, res) {
    const { name, course } = req.body;
    const normalizedCourseCode = normalizeCourseCode(course);
    const courseCode = normalizedCourseCode || course;

    const newYear = await createYearFolderWithDefaultStructure(name, courseCode);

    if (normalizedCourseCode) {
        const parent = await CourseModel.findOne({
            code: getCourseCodeCaseInsensitiveRegex(normalizedCourseCode),
        });
        if (!parent) {
            return res.status(404).json({ message: "Course not found" });
        }
        parent.children.push(newYear._id);
        await parent.save();
    }

    return res.json(newYear);
}

async function deleteYear(req, res) {
    const { folder, courseCode } = req.body;
    const folderId = folder._id;
    const normalizedCourseCode = normalizeCourseCode(courseCode);

    try {
        if (normalizedCourseCode) {
            await CourseModel.findOneAndUpdate(
                { code: getCourseCodeCaseInsensitiveRegex(normalizedCourseCode) }, 
                {$pull: { children: folderId }}
            );
        }

        const folderDoc = await FolderModel.findById(folderId);
        if (folderDoc) {
            if (folderDoc.courses.length > 1) {
                // Remove this course from the shared folder and its descendants
                await removeCourseFromFolderRecursive(folderId, normalizedCourseCode);
            } else {
                // Last course using this folder, delete it
                await recursiveDelete(folder);
            }
        }

        return res.json({ success: true, folderId });
    } catch (err) {
        console.error("Error deleting year:", err);
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

async function recursiveDelete(folder){
    if(!folder.children) {
        await FolderModel.findByIdAndDelete(folder._id);
        return;
    }
    if (folder.childType === "Folder"){
        for(const subfolder of folder.children){
            await recursiveDelete(subfolder);
        }
        await FolderModel.findByIdAndDelete(folder._id);
    }
    else if(folder.childType === "File"){
        for(const file of folder.children){
            console.log(file);
            await deleteFile(file);
        }
        await FolderModel.findByIdAndDelete(folder._id);
    }
}

export {addYear,deleteYear}
