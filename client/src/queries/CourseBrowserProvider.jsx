import { useParams } from "react-router-dom";
import { useMemo } from "react";
import { normalizeCourseCode } from "@coursehub/domain";
import { useCourse } from "./course";
import { BrowserContext } from "./browserContext";
import { findFolderById, findYearIndexForFolder } from "../utils/folderUtils";
export default function CourseBrowserProvider({ children }) {
    const { code, folderId } = useParams();
    const query = useCourse(code);
    const course = query.isError ? undefined : query.data;
    const retrying = query.isError && query.isFetching;
    const { years, index, selected, currentFolder } = useMemo(() => {
        const years = course?.children || [];
        const index = folderId ? findYearIndexForFolder(years, folderId) : years.length - 1;
        const selected = folderId ? findFolderById(years, folderId) : years[index];
        const currentFolder =
            selected?.childType === "File"
                ? {
                      ...selected,
                      children: [...selected.children].sort((a, b) => a.name.localeCompare(b.name)),
                  }
                : selected;
        return { years, index, selected, currentFolder };
    }, [course, folderId]);
    const value = useMemo(
        () => ({
            currentCourse: code ? years : null,
            currentCourseCode: normalizeCourseCode(course?.code || code),
            currentFolder: currentFolder || null,
            currentYear: index >= 0 ? index : null,
            currentYearFolderStructure: years[index]?.children || [],
            course,
            courseReady: !!code && query.isSuccess,
            loading: !!code && query.isPending,
            error: code && query.isError ? query.error : null,
            folderUnavailable: !!(code && folderId && query.isSuccess && !selected),
            retrying,
            refresh: query.refetch,
        }),
        [
            code,
            years,
            course,
            query.isSuccess,
            query.isPending,
            query.isError,
            query.error,
            retrying,
            query.refetch,
            currentFolder,
            index,
            folderId,
            selected,
        ],
    );
    return <BrowserContext value={value}>{children}</BrowserContext>;
}
