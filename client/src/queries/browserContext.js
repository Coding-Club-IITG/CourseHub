import { createContext, useContext } from "react";
export const BrowserContext = createContext({
    currentCourse: null,
    currentCourseCode: null,
    currentFolder: null,
    currentYear: null,
    currentYearFolderStructure: [],
});
export const useCourseBrowser = () => useContext(BrowserContext);
