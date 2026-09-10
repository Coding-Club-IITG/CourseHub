import { useUploadDialog } from "../contributions/dialogContext";
import FileSelectionNotice from "./components/file-display/FileSelectionNotice";
import { useSession } from "../../session/context";
import styles from "./styles.module.scss";
import { Button, FormField } from "@coursehub/ui";
import Container from "../../components/container";
import Collapsible from "./components/collapsible";

import FolderInfo from "./components/folder-info";

import BrowseFolder from "./components/browsefolder";
import NavBar from "../../components/navbar";
import Contributions from "../contributions";
import { getColors } from "../../utils/colors";
import { getSubtreeFileCount } from "../../utils/folderUtils";
import { useSearchParams, useNavigate } from "react-router-dom";
import FileController from "./components/collapsible/components/file-controller";
import YearInfo from "./components/year-info";
import CourseBrowserProvider from "../../queries/CourseBrowserProvider";
import { useCourseBrowser } from "../../queries/browserContext";
import { normalizeCourseCode } from "@coursehub/domain";
import { library, session } from "../../session/runtime";
const BrowseScreen = () => (
    <CourseBrowserProvider>
        <BrowseContent />
    </CourseBrowserProvider>
);
function BrowseContent() {
    const navigate = useNavigate();
    const [params] = useSearchParams();
    const requestedFile = params.get("file");
    const user = useSession().data;
    const {
        currentFolder: folderData,
        currentCourse: currCourse,
        currentCourseCode: currCourseCode,
        currentYear: currYear,
        course,
    } = useCourseBrowser();
    const registered = [
        ...(user?.courses || []),
        ...(user?.readOnly || []),
        ...(user?.isBR
            ? (user?.previousCourses || []).flatMap((semester) => semester.courses || [])
            : []),
    ];
    const visited = session.queryClient
        .getQueriesData({ queryKey: library.key("course").slice(0, 5) })
        .map(([, value]) => value)
        .filter(Boolean);
    const localCourses = [
        ...new Map(
            [...visited, ...(course ? [course] : [])]
                .filter(
                    (item) =>
                        !registered.some(
                            (registeredCourse) =>
                                normalizeCourseCode(registeredCourse.code) ===
                                normalizeCourseCode(item.code),
                        ),
                )
                .map((item) => [normalizeCourseCode(item.code), item]),
        ).values(),
    ];
    const allCourses = [
        ...new Map(
            [...registered, ...localCourses].map((item) => [normalizeCourseCode(item.code), item]),
        ).values(),
    ];
    const allYears = currCourse || [];
    const { setOpen: setUploadOpen } = useUploadDialog();
    const contributionHandler = () => setUploadOpen(true);
    const HeaderText =
        folderData?.childType === "File"
            ? "Select a file..."
            : folderData?.childType === "Folder"
              ? "Select a folder..."
              : currCourse
                ? "No data available for this course"
                : "Select a course...";
    const findParent = (nodes) => {
        for (const node of nodes) {
            if (node.childType !== "Folder") continue;
            if (node.children?.some((child) => child._id === folderData?._id)) return node;
            const parent = findParent(node.children || []);
            if (parent) return parent;
        }
    };
    const parent = findParent(allYears);
    const canGoBack = !!parent;
    const handleBackClick = () =>
        navigate(
            parent ? "/browse/" + currCourseCode + "/" + parent._id : "/browse/" + currCourseCode,
        );
    const handleCourseChange = (event) => {
        if (event.target.value) navigate("/browse/" + normalizeCourseCode(event.target.value));
    };
    const handleYearChange = (event) => {
        const year = allYears[Number(event.target.value)];
        if (year) navigate("/browse/" + currCourseCode + "/" + year._id);
    };
    return (
        <Container color="light" type="fluid">
            <NavBar compact />
            <div className={styles.layout}>
                <div className={styles.mobileSelection}>
                    <FormField label="Course">
                        <select value={currCourseCode || ""} onChange={handleCourseChange}>
                            <option value="" disabled>
                                Select Course
                            </option>
                            {allCourses.map((item) => (
                                <option key={item.code} value={item.code}>
                                    {item.code}: {item.name || item.code}
                                </option>
                            ))}
                        </select>
                    </FormField>
                    <FormField label="Year">
                        <select
                            value={currYear ?? ""}
                            onChange={handleYearChange}
                            disabled={!allYears.length}
                        >
                            <option value="" disabled>
                                Select Year
                            </option>
                            {allYears.map((year, index) => (
                                <option key={year._id} value={index}>
                                    {year.name}
                                    {getSubtreeFileCount(year) === 0 ? " (Empty)" : ""}
                                </option>
                            ))}
                        </select>
                    </FormField>
                </div>
                <aside className={styles.sidebar} aria-label="Course navigation">
                    <h2>MY COURSES</h2>
                    {(user?.courses || []).map((item, index) => (
                        <Collapsible key={item.code} course={item} color={getColors(index)} />
                    ))}
                    {localCourses.map((item) => (
                        <Collapsible key={item.code} course={item} color={item.color} />
                    ))}
                    {!!user?.readOnly?.length && <h2>OTHERS</h2>}
                    {(user?.readOnly || []).map((item) => (
                        <Collapsible key={item.code} course={item} color={item.color} />
                    ))}
                    {user?.isBR && !!user.previousCourses?.length && <h2>PREVIOUS COURSES</h2>}
                    {user?.isBR &&
                        (user.previousCourses || []).map((semester, index) => (
                            <div key={index}>
                                <h3>
                                    Semester {semester.semester} ({semester.year})
                                </h3>
                                {semester.courses.map((item, i) => (
                                    <Collapsible
                                        key={item.code}
                                        course={item}
                                        color={getColors(i)}
                                    />
                                ))}
                            </div>
                        ))}
                </aside>
                <aside className={styles.years} aria-label="Year navigation">
                    <YearInfo courseCode={currCourseCode} course={currCourse} currYear={currYear} />
                </aside>
                <main className={styles.main} aria-label="Course resources">
                    {folderData && (
                        <FolderInfo
                            path={folderData.path || ""}
                            name={folderData.name || HeaderText}
                            canDownload={folderData.childType === "File"}
                            contributionHandler={contributionHandler}
                            folderId={folderData._id}
                            courseCode={currCourseCode}
                        />
                    )}
                    {canGoBack && (
                        <div className={styles.back}>
                            <Button variant="link" onClick={handleBackClick}>
                                ← Back to {parent.name}
                            </Button>
                        </div>
                    )}
                    <div className={styles.files}>
                        <FileSelectionNotice />
                        {!folderData ? (
                            <p>{HeaderText}</p>
                        ) : !folderData.children?.length ? (
                            !requestedFile && (
                                <p>
                                    {folderData.childType === "File"
                                        ? "No files available."
                                        : "No folders available."}
                                </p>
                            )
                        ) : folderData.childType === "File" ? (
                            <FileController files={folderData.children} code={currCourseCode} />
                        ) : (
                            folderData.children.map((item, index) => (
                                <BrowseFolder
                                    key={item._id}
                                    name={item.name}
                                    subject={currCourseCode}
                                    folderData={item}
                                    index={index}
                                />
                            ))
                        )}
                    </div>
                </main>
            </div>
            <Contributions key={currCourseCode + "/" + (folderData?._id || "")} />
        </Container>
    );
}
export default BrowseScreen;
