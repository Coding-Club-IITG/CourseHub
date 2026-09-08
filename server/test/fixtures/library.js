export const student = {
    _id: "507f1f77bcf86cd799439011",
    name: "Library Test Student",
    email: "library-student@example.test",
    rollNumber: 240101001,
    degree: "B.Tech",
    department: "Computer Science and Engineering",
    semester: 5,
    isBR: false,
    courses: [{ code: "CS101", name: "Introduction to Computer Science" }],
    previousCourses: [],
    readOnly: [],
    favourites: [],
};
export const administrator = { _id: "507f1f77bcf86cd799439012", userId: "library-test-admin" };
export const libraryFile = {
    _id: "507f1f77bcf86cd799439021",
    fileId: "test-drive-file",
    name: "Lecture notes.pdf",
    size: "128",
    isVerified: true,
    webUrl: "https://example.test/notes",
    downloadUrl: "https://example.test/notes",
    thumbnail: { url: "https://ik.imagekit.io/coursehub-test/notes.webp" },
};
export const folder = {
    _id: "507f1f77bcf86cd799439031",
    name: "Lecture Notes",
    courses: ["CS101"],
    childType: "File",
    children: [libraryFile],
    totalFileCount: 1,
};
export const year = {
    _id: "507f1f77bcf86cd799439041",
    name: "2026",
    courses: ["CS101"],
    childType: "Folder",
    children: [folder],
    totalFileCount: 1,
};
export const course = {
    _id: "507f1f77bcf86cd799439051",
    code: "CS101",
    name: "Introduction to Computer Science",
    children: [year],
};
