import "./styles.scss";
import Container from "../../components/container";
import Dropdown from "../../components/ui/dropdown";
import Collapsible from "./components/collapsible";
import Navbar from "../../components/navbar";
import FolderInfo from "./components/folder-info";
import FileDisplay from "./components/file-display";
import BrowseFolder from "./components/browsefolder";
import { useSelector, useDispatch } from "react-redux";
import NavBarBrowseScreen from "./components/navbar";
import Contributions from "../contributions";
import { useEffect, useState } from "react";
import React from "react";
import {
    ChangeCurrentCourse,
    ChangeCurrentYearData,
    ChangeFolder,
    LoadCourses,
    UpdateCourses,
    RefreshCurrentFolder,
    PushFolderHistory,
    PopFolderHistory,
    ClearFolderHistory,
} from "../../actions/filebrowser_actions";
import { getColors } from "../../utils/colors";
import { AddNewCourseLocal, LoginUser, LogoutUser } from "../../actions/user_actions";
import { getUser } from "../../api/User";
import { useParams } from "react-router-dom";
import { getCourse } from "../../api/Course";
import { fetchFolder } from "../../api/Folder";
import { getSubtreeFileCount } from "../../utils/folderUtils";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import Share from "../share";
import FileController from "./components/collapsible/components/file-controller";
import YearInfo from "./components/year-info";
import { findCachedCourse, hasUsableCourseTree, sanitizeCourseCache } from "../../utils/courseCache";
import { readAllCoursesCache, clearAllCoursesCache } from "../../utils/frontendCache";

function useIsMobile() {
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth <= 768);
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);
    return isMobile;
}

const BrowseScreen = () => {
    const navigate = useNavigate();
    const isMobile = useIsMobile();
    const user = useSelector((state) => state.user);
    const folderData = useSelector((state) => state.fileBrowser.currentFolder);
    const folderHistory = useSelector((state) => state.fileBrowser.folderHistory);
    const refreshKey = useSelector((state) => state.fileBrowser.refreshKey);
    const currCourse = useSelector((state) => state.fileBrowser.currentCourse);
    const currCourseCode = useSelector((state) => state.fileBrowser.currentCourseCode);
    const currYear = useSelector((state) => state.fileBrowser.currentYear);
    const allCourseData = useSelector((state) => state.fileBrowser.allCourseData);

    const sortFile = (a, b) => {
        if (a?.name > b?.name) return 1;
        else if (a?.name < b?.name) return -1;
        else return 1;
    };

    if (folderData?.childType == "File" && folderData?.children?.length > 1)
        folderData?.children.sort(sortFile);  //sorting current folder files by name

    const contributionHandler = (event) => {
        const collection = document.getElementsByClassName("contri");
        const contributionSection = collection[0];
        contributionSection.classList.add("show");
    };
    const dispatch = useDispatch();
    const [loading, setLoading] = useState(true);
    const { code, folderId } = useParams();
    const fb = useSelector((state) => state.fileBrowser);

    useEffect(() => {
        const cleaned = readAllCoursesCache();
        if (cleaned.length > 0) {
            dispatch(LoadCourses(cleaned));
        }
    }, []);

    useEffect(() => {
        async function getAuth() {
            try {
                const { data } = await getUser();
                if (!data) {
                    dispatch(LogoutUser());
                    setLoading(false);
                    return;
                }
                if (data.needsCourseSync) {
                    setLoading(false);
                    return navigate("/loading");
                }
                dispatch(LoginUser(data));
                setLoading(false);
            } catch (error) {
                dispatch(LogoutUser());
                setLoading(false);
                navigate("/");
            }
        }

        if (!user?.loggedIn) {
            getAuth();
        } else {
            setLoading(false);
        }
    }, []);

    const findFolderById = (folders, id) => {
        if (!folders || !Array.isArray(folders)) return null;
        for (const folder of folders) {
            if (folder._id === id) return folder;
            if (folder.children?.length) {
                const result = findFolderById(folder.children, id);
                if (result) return result;
            }
        }
        return null;
    };

    useEffect(() => {
        if (loading || !code) {
            return;
        }
        const run = async () => {
            let sessionStorageCourses = null;
            let fetchedData = null;

            sessionStorageCourses = readAllCoursesCache();

            let currCourse = null;
            try {
                currCourse = findCachedCourse(allCourseData, code);
            } catch (error) {
                clearAllCoursesCache();
                location.reload();
            }
            const present = findCachedCourse(sessionStorageCourses, code);
            let root = [];
            if (present || currCourse) {
                fetchedData = present || currCourse;
                dispatch(AddNewCourseLocal(fetchedData));
                dispatch(ChangeCurrentCourse(fetchedData?.children || fetchedData, code));
                if (
                    fetchedData?.children &&
                    Array.isArray(fetchedData.children) &&
                    fetchedData.children.length > 0
                ) {
                    const defaultYearIndex = fetchedData.children.length - 1;
                    const defaultYear = fetchedData.children[defaultYearIndex];
                    let activeFolder = folderId ? findFolderById(fetchedData.children, folderId) : null;

                    if (defaultYear && defaultYear.children) {
                        dispatch(
                            ChangeCurrentYearData(defaultYearIndex, defaultYear.children || [])
                        );
                        dispatch(ClearFolderHistory()); // Clear history when starting with a new course/year
                        dispatch(ChangeFolder(activeFolder || defaultYear));
                    }
                }
            } else {
                let fetchingToast = toast.loading("Loading course data...");
                const response = await getCourse(code.toUpperCase());
                if (response.data.found) {
                    toast.dismiss(fetchingToast);
                    fetchedData = response.data;
                    if (!hasUsableCourseTree(fetchedData)) {
                        const refetched = await getCourse(code.toUpperCase());
                        if (refetched.data?.found) {
                            fetchedData = refetched.data;
                        }
                    }
                    dispatch(UpdateCourses(fetchedData));
                    dispatch(AddNewCourseLocal(fetchedData));
                    dispatch(
                        ChangeCurrentCourse(
                            fetchedData?.children || fetchedData,
                            code.toUpperCase()
                        )
                    );
                    if (
                        fetchedData?.children &&
                        Array.isArray(fetchedData.children) &&
                        fetchedData.children.length > 0
                    ) {
                        const defaultYearIndex = fetchedData.children.length - 1;
                        const defaultYear = fetchedData.children[defaultYearIndex];
                        let activeFolder = folderId ? findFolderById(fetchedData.children, folderId) : null;

                        if (defaultYear && defaultYear.children) {
                            dispatch(
                                ChangeCurrentYearData(defaultYearIndex, defaultYear.children || [])
                            );
                            dispatch(ClearFolderHistory()); // Clear history when starting with a new course/year
                            dispatch(ChangeFolder(activeFolder || defaultYear));
                        }
                    }
                } else {
                    toast.dismiss(fetchingToast);
                    toast.error("Course not found!");
                }
            }
        };
        run();
    }, [loading, code]);

    useEffect(() => {
        if (!code || !currCourse || !Array.isArray(currCourse) || currCourse.length === 0) {
            return;
        }

        if (folderId) {
            if (folderData?._id === folderId) return;

            const matched = findFolderById(currCourse, folderId);
            if (matched) {
                dispatch(ChangeFolder(matched));
            } else {
                fetchFolder(folderId, code)
                    .then((freshFolder) => {
                        if (freshFolder && freshFolder._id) {
                            dispatch(ChangeFolder(freshFolder));
                        } else {
                            toast.error("Folder not found!");
                            navigate(`/browse/${code}`, { replace: true });
                        }
                    })
                    .catch(() => {
                        toast.error("Folder not found!");
                        navigate(`/browse/${code}`, { replace: true });
                    });
            }
        } else {
            const defaultYear = currCourse[currYear !== null && currYear !== undefined ? currYear : currCourse.length - 1];
            if (defaultYear && folderData?._id !== defaultYear._id) {
                dispatch(ChangeFolder(defaultYear));
            }
        }
    }, [folderId, code, currCourse, currYear, folderData]);

    useEffect(() => {
        const refreshFolderData = async () => {
            if (!folderData?._id || !currCourseCode) return;

            try {
                const res = await getCourse(currCourseCode);
                if (res.data?.found) {
                    const updatedFolder = findFolderById(res.data.children, folderData._id);
                    if (updatedFolder) {
                        dispatch(ChangeFolder(updatedFolder));
                    }
                }
            } catch (err) {
                toast.error("Could not refresh folder view.");
            }
        };

        refreshFolderData();
    }, [refreshKey]);

    const HeaderText =
        folderData?.childType === "File"
            ? "Select a file..."
            : folderData?.childType === "Folder"
                ? "Select a folder..."
                : currCourse
                    ? "No data available for this course"
                    : "Select a course...";

    const handleBackClick = async () => {
        if (folderHistory.length > 0) {
            const previousFolder = folderHistory[folderHistory.length - 1];
            dispatch(PopFolderHistory());
            if (previousFolder && previousFolder._id) {
                dispatch(ChangeFolder(previousFolder));
                const isRootYear = currCourse.some(y => y._id === previousFolder._id);
                if (isRootYear) {
                    navigate(`/browse/${currCourseCode}`);
                } else {
                    navigate(`/browse/${currCourseCode}/${previousFolder._id}`);
                }

            } else {
                navigate(`/browse/${currCourseCode}`);
            }
        } else {
            navigate(`/browse/${currCourseCode}`);
        }
    };

    const canGoBack = folderHistory.length > 0 || !!(folderId && folderData?._id);
    const allCourses = [
        ...(user.user?.courses || []),
        ...(user.localCourses || []),
        ...(user.user?.readOnly || []),
        ...(user.user?.isBR && user.user?.previousCourses ? user.user.previousCourses.flatMap(sem => sem.courses) : []),
    ];
    const allYears = currCourse || [];
    const handleCourseChange = async (e) => {
        const selectedCode = e.target.value;
        if (selectedCode && selectedCode !== currCourseCode) {
            try {
                dispatch(ChangeCurrentYearData(null, []));
                dispatch(ChangeFolder(null));
                dispatch(ClearFolderHistory());
                let courseData = allCourseData?.find(
                    (course) =>
                        hasUsableCourseTree(course) &&
                        course.code?.toLowerCase() === selectedCode?.toLowerCase()
                );
                if (!courseData) {
                    try {
                        const sessionStorageCourses = readAllCoursesCache();
                        courseData = findCachedCourse(sessionStorageCourses, selectedCode);
                    } catch (error) {
                    }
                }
                if (!courseData) {
                    const fetchingToast = toast.loading("Loading course data...");
                    try {
                        const response = await getCourse(selectedCode.toUpperCase());
                        if (response.data?.found) {
                            courseData = response.data;
                            if (!hasUsableCourseTree(courseData)) {
                                const refetched = await getCourse(selectedCode.toUpperCase());
                                if (refetched.data?.found) {
                                    courseData = refetched.data;
                                }
                            }
                            dispatch(UpdateCourses(courseData));
                            dispatch(AddNewCourseLocal(courseData));
                            toast.dismiss(fetchingToast);
                        } else {
                            toast.dismiss(fetchingToast);
                            toast.error("Course not found!");
                            return;
                        }
                    } catch (error) {
                        toast.dismiss(fetchingToast);
                        toast.error("Failed to load course data!");
                        return;
                    }
                }
                dispatch(ChangeCurrentCourse(courseData?.children || courseData, selectedCode));
                navigate(`/browse/${selectedCode}`);
            } catch (error) {
                console.error("Error loading course:", error);
                toast.error("Failed to load course!");
            }
        }
    };
    const handleYearChange = (e) => {
        const selectedYearIndex = parseInt(e.target.value);
        if (selectedYearIndex !== currYear && !isNaN(selectedYearIndex)) {
            const selectedYear = allYears[selectedYearIndex];
            if (selectedYear) {
                dispatch(ClearFolderHistory()); // Clear folder history when changing years
                dispatch(ChangeCurrentYearData(selectedYearIndex, selectedYear.children));
                dispatch(ChangeFolder(selectedYear));
                dispatch(RefreshCurrentFolder());
                if (selectedYear._id) {
                    navigate(`/browse/${currCourseCode}/${selectedYear._id}`);
                } else {
                    navigate(`/browse/${currCourseCode}`);
                }
            }
        }
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
                                        <p className="empty-message">No files available.</p>
                                    ) : (
                                        <FileController
                                            files={folderData?.children}
                                            code={currCourseCode}
                                            isMobileView={isMobile}
                                        />
                                    )
                                ) : folderData?.children?.length === 0 ? (
                                    <div className="empty-folder">
                                        <p className="empty-message">No folders available.</p>
                                    </div>
                                ) : (
                                    folderData?.children.map((folder) => (
                                        <BrowseFolder
                                            type="folder"
                                            key={folder._id}
                                            path={folder.path}
                                            name={folder.name}
                                            subject={currCourseCode || (folder.courses ? folder.courses[0] : folder.course)}
                                            folderData={folder}
                                            parentFolder={folderData}
                                            isMobileView={isMobile}
                                        />
                                    ))
                                )}
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="left">
                        <h4 className="heading">MY COURSES</h4>
                        {user.user?.courses?.map((course, idx) => {
                            return (
                                <Collapsible
                                    color={getColors(idx)}
                                    key={`user-course-${idx}`}
                                    course={course}
                                    isReadOnly={false}
                                />
                            );
                        })}
                        {user.localCourses?.map((course, idx) => {
                            return (
                                <Collapsible
                                    color={course.color}
                                    key={`local-course-${idx}`}
                                    course={course}
                                />
                            );
                        })}

                        {user.user?.readOnly?.length > 0 && <h4 className="heading">OTHERS</h4>}

                        {user.user?.readOnly?.map((course, idx) => (
                            <Collapsible
                                color={course.color}
                                key={`readonly-${idx}`}
                                course={course}
                                isReadOnly={true}
                            />
                        ))}

                        {user.user?.isBR && user.user?.previousCourses?.length > 0 && (
                            <h4 className="heading">PREVIOUS COURSES</h4>
                        )}
                        {user.user?.isBR &&
                            user.user?.previousCourses?.length > 0 &&
                            user.user?.previousCourses?.map((semesterGroup, semIdx) => (
                                <div key={semIdx}>
                                    <h5 className="heading" style={{ fontSize: "0.85em", marginTop: "10px", color: "gray" }}>
                                        Semester {semesterGroup.semester} ({semesterGroup.year})
                                    </h5>
                                    {semesterGroup.courses.map((course, idx) => (
                                        <Collapsible color={getColors(idx)} key={idx} course={course} />
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
                                    isBR={user.user.isBR}
                                    path={folderData?.path ? folderData.path : HeaderText}
                                    name={folderData?.name ? folderData.name : HeaderText}
                                    canDownload={folderData?.childType === "File"}
                                    contributionHandler={contributionHandler}
                                    folderId={folderData?._id}
                                    courseCode={currCourseCode || (folderData?.courses ? folderData.courses[0] : folderData.course)}
                                />
                            )}
                            <div className="files">
                                {!folderData ? (
                                    <div className="empty-message">{HeaderText}</div>
                                ) : folderData?.childType === "File" ? (
                                    folderData?.children?.length === 0 ? (
                                        <p className="empty-message">No files available.</p>
                                    ) : (
                                        <FileController
                                            files={folderData?.children}
                                            code={currCourseCode}
                                        />
                                    )
                                ) : folderData?.children?.length === 0 ? (
                                    <div className="empty-folder">
                                        <p className="empty-message">No folders available.</p>
                                    </div>
                                ) : (
                                    folderData?.children.map((folder) => (
                                        <BrowseFolder
                                            type="folder"
                                            key={folder._id}
                                            path={folder.path}
                                            name={folder.name}
                                            subject={currCourseCode || (folder.courses ? folder.courses[0] : folder.course)}
                                            folderData={folder}
                                            parentFolder={folderData}
                                        />
                                    ))
                                )}
                            </div>
                        </div>
                        <div className="right">
                            <YearInfo
                                isBR={user.user.isBR}
                                courseCode={currCourseCode}
                                course={currCourse}
                                currYear={currYear}
                            />
                        </div>
                    </>
                )}
            </div>

            {!isMobile && <Contributions />}
        </Container>
    );
};

export default BrowseScreen;
