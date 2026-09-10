import { normalizeCourseCode as normalized } from "@coursehub/domain";
export const canManageCourse = (user, code) =>
    Boolean(code && user?.capabilities?.canManageCourses?.includes(normalized(code)));
