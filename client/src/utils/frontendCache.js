import { sanitizeCourseCache } from "./courseCache";

const ALL_COURSES_KEY = "AllCourses";
const LOCAL_COURSES_KEY = "LocalCourses";

const normalizeCourseCode = (code) => code?.toString()?.replace(/\s+/g, "")?.toLowerCase() || "";

const sanitizeLocalCourses = (courses) => {
  if (!Array.isArray(courses)) return [];
  const byCode = new Map();
  for (const course of courses) {
    if (!course || typeof course !== "object" || !course.code) continue;
    byCode.set(normalizeCourseCode(course.code), course);
  }
  return Array.from(byCode.values());
};

export const readAllCoursesCache = () => {
  try {
    const parsed = JSON.parse(sessionStorage.getItem(ALL_COURSES_KEY));
    return sanitizeCourseCache(parsed);
  } catch (error) {
    sessionStorage.removeItem(ALL_COURSES_KEY);
    return [];
  }
};
export const writeAllCoursesCache = (courses) => {
  const cleaned = sanitizeCourseCache(courses);
  sessionStorage.setItem(ALL_COURSES_KEY, JSON.stringify(cleaned));
  return cleaned;
};
export const clearAllCoursesCache = () => sessionStorage.removeItem(ALL_COURSES_KEY);
export const readLocalCoursesCache = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(LOCAL_COURSES_KEY));
    return sanitizeLocalCourses(parsed);
  } catch (error) {
    localStorage.removeItem(LOCAL_COURSES_KEY);
    return [];
  }
};
export const writeLocalCoursesCache = (courses) => {
  const cleaned = sanitizeLocalCourses(courses);
  localStorage.setItem(LOCAL_COURSES_KEY, JSON.stringify(cleaned));
  return cleaned;
};
export const upsertLocalCourseCache = (course) => {
  if (!course || typeof course !== "object" || !course.code) return readLocalCoursesCache();
  const existing = readLocalCoursesCache();
  return writeLocalCoursesCache([...existing, course]);
};
export const clearLocalCoursesCache = () => localStorage.removeItem(LOCAL_COURSES_KEY);
export const clearLegacySessionLocalCoursesCache = () =>
  sessionStorage.removeItem(LOCAL_COURSES_KEY);
export const migrateLegacyLocalCoursesFromSession = () => {
  try {
    const legacy = JSON.parse(sessionStorage.getItem(LOCAL_COURSES_KEY));
    if (!Array.isArray(legacy) || legacy.length === 0) return [];
    const merged = writeLocalCoursesCache([...readLocalCoursesCache(), ...legacy]);
    clearLegacySessionLocalCoursesCache();
    return merged;
  } catch (error) {
    clearLegacySessionLocalCoursesCache();
    return readLocalCoursesCache();
  }
};
