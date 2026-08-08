import { useMemo, useState, useEffect } from "react";
import FolderController from "./components/folder-controller";
import "./styles.scss";
import { useSelector, useDispatch } from "react-redux";
import {
    ChangeCurrentYearData,
    UpdateCourses,
    ChangeCurrentCourse,
    ChangeFolder,
    ClearFolderHistory,
} from "../../../../actions/filebrowser_actions";
import { getCourse } from "../../../../api/Course";
import { useParams, useNavigate } from "react-router-dom";
import SmallLoader from "../../../../components/SmallLoader";
import searchFolderById from "../../../../utils/searchFolderById";
import { toast } from "react-toastify";
import { capitalise } from "../../../../utils/capitalise";
import { findCachedCourse, hasUsableCourseTree } from "../../../../utils/courseCache";
import { readAllCoursesCache } from "../../../../utils/frontendCache";

const Collapsible = ({ course, color, state = false }) => {
    const normalizedCode = useMemo(
        () => course.code?.replaceAll(" ", "").toLowerCase() || "",
        [course.code]
    );

    const [open, setOpen] = useState(state);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(false);
    const [notFound, setNotFound] = useState(false);
    const yearTree = useSelector((state) => state.fileBrowser.currentYearFolderStructure);
    const currCourseCode = useSelector((state) => state.fileBrowser.currentCourseCode);
    const currentYear = useSelector((state) => state.fileBrowser.currentYear);
    const currentCourse = useSelector((state) => state.fileBrowser.currentCourse);
    const allCourseData = useSelector((state) => state.fileBrowser.allCourseData);
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const currentFolder = useSelector((state) => state.fileBrowser.currentFolder);
    const { code, folderId } = useParams();

    const isCurrentCourse =
        currCourseCode?.replaceAll(" ", "").toLowerCase() === normalizedCode;

    const getCachedCourse = () => {
        const cachedInStore = findCachedCourse(allCourseData, normalizedCode);
        if (cachedInStore) return cachedInStore;

        try {
            const fromSession = readAllCoursesCache();
            return findCachedCourse(fromSession, normalizedCode);
        } catch (e) {
            return null;
        }
    };

    const setActiveCourse = (courseData) => {
        if (!courseData?.children) return;

        const selectedCourseCode = courseData.code?.replaceAll(" ", "").toUpperCase();
        dispatch(ChangeCurrentCourse(courseData.children, selectedCourseCode));

        const hasSameCourse =
            currCourseCode?.replaceAll(" ", "").toLowerCase() ===
            selectedCourseCode?.toLowerCase();

        let yearIndex = courseData.children.length - 1;
        if (hasSameCourse && currentYear !== null && courseData.children[currentYear]) {
            yearIndex = currentYear;
        }

        const yearFolder = courseData.children?.[yearIndex] || null;
        const yearChildren = Array.isArray(yearFolder?.children) ? yearFolder.children : [];

        dispatch(ChangeCurrentYearData(yearIndex, yearChildren));
        dispatch(ClearFolderHistory());
        dispatch(ChangeFolder(yearFolder));

        navigate(`/browse/${selectedCourseCode}`);
    };

    const fetchAndActivateCourse = async () => {
        const cachedCourse = getCachedCourse();
        if (cachedCourse) {
            setError(false);
            setNotFound(false);
            setActiveCourse(cachedCourse);
            return;
        }

        setLoading(true);

        try {
            const loadingToastId = toast.loading("Loading course data...");
            const response = await getCourse(course.code?.replaceAll(" ", ""));
            toast.dismiss(loadingToastId);

            if (!response?.data?.found) {
                setNotFound(true);
                setError(false);
                return;
            }

            let fetchedCourse = response.data;
            if (!hasUsableCourseTree(fetchedCourse)) {
                const refetched = await getCourse(course.code?.replaceAll(" ", ""));
                if (refetched?.data?.found) {
                    fetchedCourse = refetched.data;
                }
            }
            dispatch(UpdateCourses(fetchedCourse));
            setNotFound(false);
            setError(false);
            setActiveCourse(fetchedCourse);
        } catch (err) {
            setError(true);
            setNotFound(false);
            toast.error("Something went wrong while loading the course.");
        } finally {
            setLoading(false);
        }
    };

    const onClick = () => {
        if (open && isCurrentCourse) {
            setOpen(false);
            dispatch(ChangeCurrentYearData(null, []));
            return;
        }

        setOpen(true);
        fetchAndActivateCourse();
    };

    useEffect(() => {
        setOpen(isCurrentCourse);
    }, [isCurrentCourse]);

    useEffect(() => {
        if (!isCurrentCourse || !code || !folderId) return;
        if (code?.toLowerCase() !== normalizedCode) return;
        const searchedFolder = searchFolderById(currentCourse, folderId);

        if (searchedFolder && searchedFolder._id !== currentFolder?._id) {
            dispatch(ChangeFolder(searchedFolder));
        }
    }, [isCurrentCourse, code, folderId, normalizedCode, currentCourse, currentFolder, dispatch]);

    const showTree =
        !loading &&
        !error &&
        !notFound &&
        isCurrentCourse &&
        Array.isArray(yearTree);

    return (
        <div className={`collapsible ${open}`}>
            <div className="main" onClick={onClick}>
                <div className="color" style={{ backgroundColor: color ? color : "#6F8FFE" }}></div>
                <div className="content">
                    <div className="text">
                        <p className="code">{course.code ? course.code.toUpperCase() : "CL 301"}</p>
                        <p className="name">
                            {course.name ? capitalise(course.name) : "Name Unavailable"}
                        </p>
                    </div>
                    <div className="arrow"></div>
                </div>
            </div>
            <div className="collapsible-content">
                {loading && <SmallLoader text="Loading course..." />}
                {error && "error"}
                {notFound && "course not added yet"}
                {showTree && <FolderController folders={yearTree} />}
            </div>
        </div>
    );
};

export default Collapsible;
