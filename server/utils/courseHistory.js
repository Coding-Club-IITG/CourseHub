export const needsPreviousCourseSync = (user) =>
    user.email?.toLowerCase() !== "guest@coursehubiitg.in" &&
    !user.previousCoursesSyncedAt &&
    (!Array.isArray(user.previousCourses) || user.previousCourses.length === 0);
