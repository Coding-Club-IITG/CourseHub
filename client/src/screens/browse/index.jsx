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
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import Share from "../share";
import FileController from "./components/collapsible/components/file-controller";
import YearInfo from "./components/year-info";

// Custom hook to detect mobile view
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
        folderData?.children.sort(sortFile);

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
        sessionStorage.removeItem("AllCourses");
    }, []);
    useEffect(() => {
        if (sessionStorage.getItem("AllCourses") !== null) {
            try {
                dispatch(LoadCourses(JSON.parse(sessionStorage.getItem("AllCourses"))));
            } catch (error) {
                dispatch(LoadCourses([]));
                // console.log("load error");
            }
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
                dispatch(LoginUser(data));
                setLoading(false);
            } catch (error) {
                dispatch(LogoutUser());
                // console.log("in index.js error loading");
                setLoading(false);
                navigate("/login");
            }
        }

        if (!user?.loggedIn) {
            getAuth();
        } else {
            // User is already logged in, set loading to false
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        // console.log("Course loading useEffect triggered:", { loading, code, hasCode: !!code });
        if (loading || !code) {
            // console.log("Exiting early - loading:", loading, "code:", code);
            return;
        }
        const run = async () => {
            let sessionStorageCourses = null;
            let fetchedData = null;

            try {
                sessionStorageCourses = JSON.parse(sessionStorage.getItem("AllCourses"));
            } catch (error) {
                sessionStorageCourses = null;
            }

            let currCourse = null;
            try {
                currCourse = allCourseData?.find(
                    (course) => course.code?.toLowerCase() === code?.toLowerCase()
                );
            } catch (error) {
                sessionStorage.removeItem("AllCourses");
                location.reload();
            }
            const present = sessionStorageCourses?.find(
                (course) => course.code?.toLowerCase() === code.toLowerCase()
            );
            let root = [];
            if (present || currCourse) {
                // console.log("found in sessionStorage");
                fetchedData = present || currCourse;
                // console.log("Course found in cache:", {
                //     fetchedData,
                //     hasChildren: !!fetchedData?.children,
                //     isArray: Array.isArray(fetchedData?.children),
                //     childrenLength: fetchedData?.children?.length,
                //     isMobile,
                // });
                // console.log(fetchedData);
                dispatch(AddNewCourseLocal(fetchedData));
                dispatch(ChangeCurrentCourse(fetchedData?.children || fetchedData, code));

                // Auto-select default year after course is loaded
                if (
                    fetchedData?.children &&
                    Array.isArray(fetchedData.children) &&
                    fetchedData.children.length > 0
                ) {
                    const defaultYearIndex = fetchedData.children.length - 1;
                    const defaultYear = fetchedData.children[defaultYearIndex];
                    // console.log("Checking default year:", {
                    //     defaultYear,
                    //     hasChildren: !!defaultYear?.children,
                    //     childrenLength: defaultYear?.children?.length,
                    // });
                    if (defaultYear && defaultYear.children) {
                        // console.log(
                        //     "Auto-selecting year after course load:",
                        //     defaultYear.name,
                        //     "isMobile:",
                        //     isMobile
                        // );
                        dispatch(
                            ChangeCurrentYearData(defaultYearIndex, defaultYear.children || [])
                        );
                        dispatch(ClearFolderHistory()); // Clear history when starting with a new course/year
                        dispatch(ChangeFolder(defaultYear));
                    } else {
                        // console.log("Default year has no children, skipping auto-select");
                    }
                } else {
                    // console.log("Course has no valid children array, skipping auto-select");
                }
            } else {
                let fetchingToast = toast.loading("Loading course data...");
                const response = await getCourse(code.toUpperCase());
                if (response.data.found) {
                    toast.dismiss(fetchingToast);
                    fetchedData = response.data;
                    dispatch(UpdateCourses(fetchedData));
                    dispatch(AddNewCourseLocal(fetchedData));
                    dispatch(
                        ChangeCurrentCourse(
                            fetchedData?.children || fetchedData,
                            code.toUpperCase()
                        )
                    );

                    // Auto-select default year after course is loaded from API
                    if (
                        fetchedData?.children &&
                        Array.isArray(fetchedData.children) &&
                        fetchedData.children.length > 0
                    ) {
                        const defaultYearIndex = fetchedData.children.length - 1;
                        const defaultYear = fetchedData.children[defaultYearIndex];
                        if (defaultYear && defaultYear.children) {
                            // console.log(
                            //     "Auto-selecting year after API load:",
                            //     defaultYear.name,
                            //     "isMobile:",
                            //     isMobile
                            // );
                            dispatch(
                                ChangeCurrentYearData(defaultYearIndex, defaultYear.children || [])
                            );
                            dispatch(ClearFolderHistory()); // Clear history when starting with a new course/year
                            dispatch(ChangeFolder(defaultYear));
                        }
                    }
                } else {
                    toast.dismiss(fetchingToast);
                    toast.error("Course not found!");
                }
            }
        };
        run();

        // console.log("code search");
    }, [loading, code]);

    // console.log("folderData?.children: ", folderData?.children);

    // useEffect(() => {
    // console.log(fb);
    // console.log(user);
    // }, [fb, user]);

    // const fetchCourseDataAgain = async (courseCode) => {
    // try {
    //     const courseCode = currCourseCode ;
    //     const fetchedData = await getCourse(courseCode.toLowerCase());
    //     if (fetchedData.data.found) {
    //     dispatch(UpdateCourses(fetchedData.data));
    //     dispatch(AddNewCourseLocal(fetchedData.data));
    //     } else {
    //     toast.error("Course not found!");
    //     }
    // } catch (error) {
    //     console.error("Error refetching course data:", error);
    // }
    // };

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

    const findFolderById = (folders, id) => {
        for (const folder of folders) {
            if (folder._id === id) return folder;
            if (folder.children?.length) {
                const result = findFolderById(folder.children, id);
                if (result) return result;
            }
        }
        return null;
    };

    const HeaderText =
        folderData?.childType === "File"
            ? "Select a file..."
            : folderData?.childType === "Folder"
            ? "Select a folder..."
            : currCourse
            ? "No data available for this course"
            : "Select a course...";

    // Handler for back button
    const handleBackClick = () => {
        if (folderHistory.length > 0) {
            dispatch(PopFolderHistory());
        }
    };

    // Check if we can go back (not at course root)
    const canGoBack = folderHistory.length > 0;

    // Helper: get all courses for dropdown
    const allCourses = [
        ...(user.user?.courses || []),
        ...(user.localCourses || []),
        ...(user.user?.readOnly || []),
        ...(user.user?.isBR && user.user?.previousCourses ? user.user.previousCourses : []),
    ];

    // Helper: get all years for dropdown (from currCourse)
    const allYears = currCourse || [];

    // Handlers for dropdowns
    const handleCourseChange = async (e) => {
        const selectedCode = e.target.value;
        if (selectedCode && selectedCode !== currCourseCode) {
            try {
                // Clear current folder data while loading
                dispatch(ChangeCurrentYearData(null, []));
                dispatch(ChangeFolder(null));
                dispatch(ClearFolderHistory()); // Clear folder history when changing courses

                // Check if course is already in memory
                let courseData = allCourseData?.find(
                    (course) => course.code?.toLowerCase() === selectedCode?.toLowerCase()
                );

                // Check session storage if not in memory
                if (!courseData) {
                    try {
                        const sessionStorageCourses = JSON.parse(
                            sessionStorage.getItem("AllCourses")
                        );
                        courseData = sessionStorageCourses?.find(
                            (course) => course.code?.toLowerCase() === selectedCode?.toLowerCase()
                        );
                    } catch (error) {
                        // Session storage error, continue to fetch from API
                    }
                }

                // If still not found, fetch from API
                if (!courseData) {
                    const fetchingToast = toast.loading("Loading course data...");
                    try {
                        const response = await getCourse(selectedCode.toUpperCase());
                        if (response.data?.found) {
                            courseData = response.data;
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

                // Set the course data in Redux store
                dispatch(ChangeCurrentCourse(courseData?.children || courseData, selectedCode));

                // Navigate to the course
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
                                        options={allYears.map((year, idx) => ({
                                            value: idx.toString(),
                                            label: year?.name || `Year ${idx + 1}`,
                                        }))}
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
                                            subject={folder.course}
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
                            user.user?.previousCourses?.map((course, idx) => {
                                return (
                                    <Collapsible color={getColors(idx)} key={idx} course={course} />
                                );
                            })}
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
                                    prof={folderData?.profName ? folderData.profName : ""}
                                    canDownload={folderData?.childType === "File"}
                                    contributionHandler={contributionHandler}
                                    folderId={folderData?._id}
                                    courseCode={folderData?.course}
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
                                            subject={folder.course}
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
