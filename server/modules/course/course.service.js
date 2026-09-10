import CourseModel, { FolderModel } from "./course.model.js";
import { loadLibraryGraph, validateTreeChange, treeId } from "../../services/folderTrees.js";
import { mutateContent } from "../../services/contentMutation.js";
import { normalizeCourseCode } from "../../utils/course.js";
import AppError from "../../utils/appError.js";

export const createYearFolderWithDefaultStructure = async (yearName, courseCode) => {
    if (typeof yearName !== "string" || !yearName.trim() || yearName.length > 200)
        throw new AppError(400, "A valid year name is required");
    const code = normalizeCourseCode(courseCode),
        folders = [];
    const create = (name, childType, children = []) => {
        const folder = new FolderModel({
            name,
            childType,
            children: children.map((item) => item._id),
            courses: [code],
        });
        folders.push(folder);
        return folder;
    };
    const exams = create(
        "Exams",
        "Folder",
        ["Quiz-1", "MidSem", "Quiz-2", "EndSem"].map((name) => create(name, "File")),
    );
    const year = create(yearName.trim(), "Folder", [
        exams,
        ...["Lectures", "Assignments", "Resources"].map((name) => create(name, "File")),
    ]);
    const graph = await loadLibraryGraph(),
        course = graph.courses.get(code);
    if (!course) throw new AppError(404, "Course not found");
    validateTreeChange(
        graph,
        {
            folders: folders.map((folder) => folder.toObject()),
            courses: [{ ...course, children: [...course.children, year._id] }],
        },
        [code],
    );
    await FolderModel.insertMany(folders);
    return year;
};

export const bootstrapCourseFolders = async (courseCode) => {
    const code = normalizeCourseCode(courseCode);
    return mutateContent({}, [code], async () => {
        const graph = await loadLibraryGraph(),
            course = graph.courses.get(code);
        if (!course) return [];
        const existing = new Set(
            course.children
                .filter((id) => graph.folderCourses.get(treeId(id))?.has(code))
                .map((id) => graph.folders.get(treeId(id)).name.trim()),
        );
        const year = new Date().getFullYear(),
            created = [];
        for (const name of Array.from({ length: 5 }, (_, i) => String(year - i))) {
            if (existing.has(name)) continue;
            const folder = await createYearFolderWithDefaultStructure(name, code);
            // Append each validated structure atomically
            await CourseModel.updateOne(
                { _id: course._id },
                { $addToSet: { children: folder._id } },
            );
            created.push(folder._id);
        }
        return created;
    });
};
