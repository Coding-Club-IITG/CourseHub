const normalized = (code) => code?.replace(/\s+/g, "").toUpperCase();
export const canManageCourse = (user, code) =>
    Boolean(code && user?.capabilities?.canManageCourses?.includes(normalized(code)));
