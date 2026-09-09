import FileSelectionNotice from "./components/file-display/FileSelectionNotice";
import { useSession } from "../../session/context";
import "./styles.scss";
import Container from "../../components/container";
import Dropdown from "../../components/ui/dropdown";
import Collapsible from "./components/collapsible";

import FolderInfo from "./components/folder-info";

import BrowseFolder from "./components/browsefolder";
import NavBarBrowseScreen from "./components/navbar";
import Contributions from "../contributions";
import { useEffect, useState } from "react";
import { getColors } from "../../utils/colors";
import { getSubtreeFileCount } from "../../utils/folderUtils";
import { useSearchParams, useNavigate } from "react-router-dom";
import FileController from "./components/collapsible/components/file-controller";
import YearInfo from "./components/year-info";
import CourseBrowserProvider from "../../queries/CourseBrowserProvider";
import { useCourseBrowser } from "../../queries/browserContext";
import { normalizeCourseCode } from "@coursehub/domain";
import { library, session } from "../../session/runtime";
function useIsMobile() {
    const [mobile, setMobile] = useState(window.innerWidth <= 768);
    useEffect(() => {
        const resize = () => setMobile(window.innerWidth <= 768);
        window.addEventListener("resize", resize);
        return () => window.removeEventListener("resize", resize);
    }, []);
    return mobile;
}
const BrowseScreen = () => (
    <CourseBrowserProvider>
        <BrowseContent />
    </CourseBrowserProvider>
);
function BrowseContent() {
    const navigate = useNavigate();
    const [params] = useSearchParams();
    const requestedFile = params.get("file");
    const isMobile = useIsMobile();
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
    const contributionHandler = () => document.querySelector(".contri")?.classList.add("show");
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
        <Container color={"light"} type={"fluid"}>
            <div className="navbar-browse-screen">
                <NavBarBrowseScreen />
            </div>
            <div className="controller">
                {isMobile ? (
                    <>
                        <div className="mobile-content">
                            <div className="mobile-dropdowns-compact">
                                <div className="dropdown-group-compact">
                                    <Dropdown
                                        placeholder="Select Course"
                                        value={currCourseCode || ""}
                                        onValueChange={(value) =>
                                            handleCourseChange({ target: { value } })
                                        }
                                        options={allCourses.map((course) => ({
                                            value: course.code,
                                            label: `${course.code}: ${course.name || course.code}`,
                                        }))}
                                    />
                                </div>
                                <div className="dropdown-group-compact">
                                    <Dropdown
                                        placeholder="Select Year"
                                        value={
                                            currYear !== null && currYear !== undefined
                                                ? currYear.toString()
                                                : ""
                                        }
                                        onValueChange={(value) =>
                                            handleYearChange({ target: { value } })
                                        }
                                        disabled={!currCourse || !allYears.length}
                                        options={allYears.map((year, idx) => {
                                            const count = getSubtreeFileCount(year);
                                            const isYearEmpty = count === 0;
                                            return {
                                                value: idx.toString(),
                                                label: `${year?.name || `Year ${idx + 1}`}${isYearEmpty ? " (Empty)" : ""}`,
                                            };
                                        })}
                                    />
                                </div>
                            </div>
                            <div className="files">
                                <FileSelectionNotice />
                                {canGoBack && (
                                    <button
                                        className="mobile-back-btn-circular"
                                        onClick={handleBackClick}
                                    >
                                        <i className="fa fa-arrow-left" aria-hidden="true"></i>
                                        <span>Back</span>
                                    </button>
                                )}
                                {!folderData ? (
                                    <div className="empty-message">{HeaderText}</div>
                                ) : folderData?.childType === "File" ? (
                                    folderData?.children?.length === 0 ? (
                                        !requestedFile && (
                                            <p
                                                className="empty-message"
                                                key={folderData?._id || "empty-files"}
                                            >
                                                No files available.
                                            </p>
                                        )
                                    ) : (
                                        <FileController
                                            files={folderData?.children}
                                            code={currCourseCode}
                                            isMobileView={isMobile}
                                        />
                                    )
                                ) : folderData?.children?.length === 0 ? (
                                    <div
                                        className="empty-folder"
                                        key={folderData?._id || "empty-folders"}
                                    >
                                        <p className="empty-message">No folders available.</p>
                                    </div>
                                ) : (
                                    folderData?.children.map((folder, idx) => (
                                        <BrowseFolder
                                            type="folder"
                                            key={folder._id}
                                            path={folder.path}
                                            name={folder.name}
                                            subject={
                                                currCourseCode ||
                                                (folder.courses ? folder.courses[0] : folder.course)
                                            }
                                            folderData={folder}
                                            parentFolder={folderData}
                                            isMobileView={isMobile}
                                            index={idx}
                                        />
                                    ))
                                )}
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="left">
                        <h4 className="heading">MY COURSES</h4>
                        {user?.courses?.map((course, idx) => {
                            return (
                                <Collapsible
                                    color={getColors(idx)}
                                    key={`user-course-${idx}`}
                                    course={course}
                                    isReadOnly={false}
                                />
                            );
                        })}
                        {localCourses?.map((course, idx) => {
                            return (
                                <Collapsible
                                    color={course.color}
                                    key={`local-course-${idx}`}
                                    course={course}
                                />
                            );
                        })}

                        {user?.readOnly?.length > 0 && <h4 className="heading">OTHERS</h4>}

                        {user?.readOnly?.map((course, idx) => (
                            <Collapsible
                                color={course.color}
                                key={`readonly-${idx}`}
                                course={course}
                                isReadOnly={true}
                            />
                        ))}

                        {user?.isBR && user?.previousCourses?.length > 0 && (
                            <h4 className="heading">PREVIOUS COURSES</h4>
                        )}
                        {user?.isBR &&
                            user?.previousCourses?.length > 0 &&
                            user?.previousCourses?.map((semesterGroup, semIdx) => (
                                <div key={semIdx}>
                                    <h5 className="semester-subheading">
                                        Semester {semesterGroup.semester} ({semesterGroup.year})
                                    </h5>
                                    {semesterGroup.courses.map((course, idx) => (
                                        <Collapsible
                                            color={getColors(idx)}
                                            key={idx}
                                            course={course}
                                        />
                                    ))}
                                </div>
                            ))}
                    </div>
                )}
                {!isMobile && (
                    <>
                        <div className="middle">
                            {folderData && (
                                <FolderInfo
                                    isBR={user.isBR}
                                    path={folderData?.path ? folderData.path : ""}
                                    name={folderData?.name ? folderData.name : HeaderText}
                                    canDownload={folderData?.childType === "File"}
                                    contributionHandler={contributionHandler}
                                    folderId={folderData?._id}
                                    courseCode={
                                        currCourseCode ||
                                        (folderData?.courses
                                            ? folderData.courses[0]
                                            : folderData.course)
                                    }
                                />
                            )}
                            <div className="files">
                                <FileSelectionNotice />
                                {!folderData ? (
                                    <div className="empty-message" key="no-folder">
                                        {HeaderText}
                                    </div>
                                ) : folderData?.childType === "File" ? (
                                    folderData?.children?.length === 0 ? (
                                        !requestedFile && (
                                            <p
                                                className="empty-message"
                                                key={folderData?._id || "empty-files"}
                                            >
                                                No files available.
                                            </p>
                                        )
                                    ) : (
                                        <FileController
                                            files={folderData?.children}
                                            code={currCourseCode}
                                        />
                                    )
                                ) : folderData?.children?.length === 0 ? (
                                    <div
                                        className="empty-folder"
                                        key={folderData?._id || "empty-folders"}
                                    >
                                        <p className="empty-message">No folders available.</p>
                                    </div>
                                ) : (
                                    folderData?.children.map((folder, idx) => (
                                        <BrowseFolder
                                            type="folder"
                                            key={folder._id}
                                            path={folder.path}
                                            name={folder.name}
                                            subject={
                                                currCourseCode ||
                                                (folder.courses ? folder.courses[0] : folder.course)
                                            }
                                            folderData={folder}
                                            parentFolder={folderData}
                                            index={idx}
                                        />
                                    ))
                                )}
                            </div>
                        </div>
                        <div className="right">
                            <YearInfo
                                isBR={user.isBR}
                                courseCode={currCourseCode}
                                course={currCourse}
                                currYear={currYear}
                            />
                        </div>
                    </>
                )}
            </div>

            <Contributions key={`${currCourseCode}/${folderData?._id || ""}`} />
        </Container>
    );
}

export default BrowseScreen;
