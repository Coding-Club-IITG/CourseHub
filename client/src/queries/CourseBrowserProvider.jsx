import { useParams, Link } from "react-router-dom";
import { normalizeCourseCode } from "@coursehub/domain";
import { RequestError } from "@coursehub/browser/react";
import { useCourse } from "./course";
import { BrowserContext } from "./browserContext";
import { findFolderById, findYearIndexForFolder } from "../utils/folderUtils";
import NavBar from "../components/navbar";
import Loader from "../components/Loader";
export default function CourseBrowserProvider({ children }) {
    const { code, folderId } = useParams();
    const query = useCourse(code);
    const years = query.data?.children || [];
    const index = folderId ? findYearIndexForFolder(years, folderId) : years.length - 1;
    const selected = folderId ? findFolderById(years, folderId) : years[index];
    const currentFolder =
        selected?.childType === "File"
            ? {
                  ...selected,
                  children: [...selected.children].sort((a, b) => a.name.localeCompare(b.name)),
              }
            : selected;
    if (code && (query.isPending || query.isError || (folderId && !selected)))
        return (
            <>
                <NavBar compact />
                {query.isError ? (
                    <RequestError error={query.error} onRetry={query.refetch} />
                ) : query.isPending ? (
                    <div className="session-gate">
                        <Loader text="Loading course data..." />
                    </div>
                ) : (
                    <RequestError title="This folder is unavailable." onRetry={query.refetch} />
                )}
                {!query.isPending && (
                    <p style={{ margin: "24px" }}>
                        <Link to={"/browse/" + code}>Open course</Link>
                    </p>
                )}
            </>
        );
    return (
        <BrowserContext
            value={{
                currentCourse: code ? years : null,
                currentCourseCode: normalizeCourseCode(query.data?.code || code),
                currentFolder: currentFolder || null,
                currentYear: index >= 0 ? index : null,
                currentYearFolderStructure: years[index]?.children || [],
                course: query.data,
                refresh: query.refetch,
            }}
        >
            {children}
        </BrowserContext>
    );
}
