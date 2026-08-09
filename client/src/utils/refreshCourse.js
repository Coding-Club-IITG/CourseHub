import {getCourse} from "../api/Course";
import
{
    UpdateCourses,
    ChangeCurrentCourse,
    ChangeCurrentYearData,
    ChangeFolder,
} from "../actions/filebrowser_actions";

import searchFolderById from "./searchFolderById";

export const refreshCourseFromServer = async (dispatch, code, { yearIndex = null, folderId = null}) => 
{
    if(!code) 
        return;

    let response;

    try
    {
        response = await getCourse(code.toUpperCase());
    }
    catch(err)
    {
        console.warn("Failed", err);
        return;
    }
    const fresh = response?.data;
    if(!fresh?.found || !Array.isArray(fresh.children))
        return;

    const CODE = code.toUpperCase();
    const years = fresh.children;

    dispatch(UpdateCourses(fresh))
    dispatch(ChangeCurrentCourse(years, CODE));

    const safeYearIndex = yearIndex !== null && yearIndex >= 0 && yearIndex < years.length ? yearIndex : years.length - 1;
    const yearFolder = years[safeYearIndex] || null;
    const yearChildren = Array.isArray(yearFolder?.children) ? yearFolder.children : [];
    dispatch(ChangeCurrentYearData(safeYearIndex, yearChildren));
    
    let targetFolder = yearFolder;
    if(folderId)
    {
        targetFolder = searchFolderById(years, folderId);
    }

    dispatch(ChangeFolder(targetFolder));
};
export default refreshCourseFromServer;


