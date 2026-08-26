import { FolderModel } from "./course.model.js";
import CourseModel from "./course.model.js";

export const createYearFolderWithDefaultStructure = async (yearName, courseCode) => {
    // 1. Create Exam Sub-folders
    const examSubFolders = ["Quiz-1", "MidSem", "Quiz-2", "EndSem"];
    const examSubFolderDocs = await Promise.all(
        examSubFolders.map((name) =>
            FolderModel.create({
                name,
                courses: [courseCode],
                childType: "File",
                children: [],
            })
        )
    );

    // 2. Create Exams Folder with sub-folders
    const examsFolder = await FolderModel.create({
        name: "Exams",
        courses: [courseCode],
        childType: "Folder",
        children: examSubFolderDocs.map((doc) => doc._id),
    });

    // 3. Create other top-level folders for the year
    const otherFolders = ["Lectures", "Assignments", "Resources"];
    const otherFolderDocs = await Promise.all(
        otherFolders.map((name) =>
            FolderModel.create({
                name,
                courses: [courseCode],
                childType: "File",
                children: [],
            })
        )
    );

    // 4. Create Year Folder
    const yearFolder = await FolderModel.create({
        name: yearName,
        courses: [courseCode],
        childType: "Folder",
        children: [examsFolder._id, ...otherFolderDocs.map((doc) => doc._id)],
    });

    return yearFolder;
};

export const bootstrapCourseFolders = async (courseCode) => {
    const currentYear = new Date().getFullYear();
    const targetYears = Array.from({ length: 5 }, (_, i) => (currentYear - i).toString());

    // Fetch existing course with children names to avoid duplicates (case-insensitive)
    const course = await CourseModel.findOne({ code: new RegExp('^' + courseCode + '$', 'i') }).populate("children", "name");
    if (!course) return [];

    const actualCourseCode = course.code;
    const existingYearNames = course.children.map((child) => child.name);
    const missingYears = targetYears.filter((year) => !existingYearNames.includes(year));

    if (missingYears.length === 0) return [];

    const newYearFolderIds = [];

    for (const year of missingYears) {
        const yearFolder = await createYearFolderWithDefaultStructure(year, actualCourseCode);
        newYearFolderIds.push(yearFolder._id);
    }

    // Update Course with ONLY the newly created year folders
    await CourseModel.findOneAndUpdate(
        { _id: course._id },
        { $push: { children: { $each: newYearFolderIds } } }
    );

    return newYearFolderIds;
};
