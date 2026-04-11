import { toast } from "react-toastify";
import { useState } from "react";
import { useSelector } from "react-redux";
import { addYear, deleteYear } from "../../../../api/Year";
import { getCourse } from "../../../../api/Course";
import { useDispatch } from "react-redux";
import {
    ChangeCurrentYearData,
    ChangeCurrentCourse,
    ChangeFolder,
    UpdateCourses,
    ClearFolderHistory,
    RefreshCurrentFolder,
} from "../../../../actions/filebrowser_actions";

import { ConfirmDialog } from "./confirmDialog";
import { ConfirmDelDialog } from "./confirmDelDialog";

const YearInfo = ({
    isBR,
    courseCode,
    course, // years list
    currYear,
}) => {
    const dispatch = useDispatch();
    const [showConfirm, setShowConfirm] = useState(false);
    const [showConfirmDel, setShowConfirmDel] = useState(false);
    const [newYearName, setNewYearName] = useState("");
    const [isAddingYear, setIsAddingYear] = useState(false);
    const user = useSelector((state) => state.user.user);
    const isReadOnlyCourse = user?.readOnly?.some(
        (c) => c.code.toLowerCase() === courseCode?.toLowerCase()
    );

    const handleAddYear = () => {
        setNewYearName("");
        setShowConfirm(true);
    };

    const handleConfirmAddYear = async () => {
        if (isAddingYear) return;
        setIsAddingYear(true);
        const yearName = newYearName.trim();

        if (!yearName) {
            setIsAddingYear(false);
            return;
        }
        if (course.some((y) => y.name.toLowerCase() === yearName.toLowerCase())) {
            toast.error(`Year "${yearName}" already exists.`);
            setIsAddingYear(false);
            return;
        }
        if (!courseCode) {
            toast.error("No course selected.");
            setIsAddingYear(false);
            return;
        }

        try {
            const res = await getCourse(courseCode);
            if (!res.data?.found) {
                toast.error("Course not found. Cannot add year.");
                setIsAddingYear(false);
                return;
            }
            const selectedYearId = course?.[currYear]?._id;

            await addYear({
                name: yearName.trim(),
                course: courseCode,
            });

            const refreshed = await getCourse(courseCode);
            if (!refreshed.data?.found) {
                toast.error("Course not found after creating year.");
                setIsAddingYear(false);
                return;
            }

            const latestCourse = refreshed.data;
            const latestYears = Array.isArray(latestCourse.children) ? latestCourse.children : [];

            let nextYearIndex = 0;
            if (selectedYearId) {
                const existingYearIndex = latestYears.findIndex((y) => y._id === selectedYearId);
                if (existingYearIndex >= 0) {
                    nextYearIndex = existingYearIndex;
                }
            }

            const nextYearFolder = latestYears[nextYearIndex] || null;
            const nextYearChildren = Array.isArray(nextYearFolder?.children)
                ? nextYearFolder.children
                : [];

            dispatch(UpdateCourses(latestCourse));
            dispatch(ChangeCurrentCourse(latestYears, latestCourse.code));
            dispatch(ChangeCurrentYearData(nextYearIndex, nextYearChildren));
            dispatch(ChangeFolder(nextYearFolder));
            dispatch(ClearFolderHistory());
            dispatch(RefreshCurrentFolder());

            toast.success(`Year "${yearName}" added`);
        } catch (error) {
            toast.error("Failed to add year.");
        }
        setShowConfirm(false);
        setIsAddingYear(false);
    };

    const handleDeleteYear = () => {
        setShowConfirmDel(true);
    };

    const handleConfirmDeleteYear = async (e) => {
        try {
            await deleteYear({
                folder: course[currYear],
                courseCode: courseCode,
            });

            const refreshed = await getCourse(courseCode);
            if (!refreshed.data?.found) {
                toast.error("Course not found after deleting year.");
                setShowConfirmDel(false);
                return;
            }

            const latestCourse = refreshed.data;
            const latestYears = Array.isArray(latestCourse.children) ? latestCourse.children : [];

            const nextYearIndex = latestYears.length
                ? Math.min(currYear, latestYears.length - 1)
                : null;
            const nextYearFolder =
                nextYearIndex !== null && nextYearIndex >= 0 ? latestYears[nextYearIndex] : null;
            const nextYearChildren = Array.isArray(nextYearFolder?.children)
                ? nextYearFolder.children
                : [];

            dispatch(UpdateCourses(latestCourse));
            dispatch(ChangeCurrentCourse(latestYears, latestCourse.code));
            dispatch(ChangeCurrentYearData(nextYearIndex, nextYearChildren));
            dispatch(ChangeFolder(nextYearFolder));
            dispatch(ClearFolderHistory());
            dispatch(RefreshCurrentFolder());

            toast.success("Year deleted successfully!");
        } catch (err) {
            toast.error("Failed to delete year.");
        }
        setShowConfirmDel(false);
    };

    const cancelDelete = () => {
        setShowConfirmDel(false);
    };

    return (
        <>
            <div>
                <div className="year-content">
                    {course &&
                        course.map((year, idx) => {
                            return (
                                <div key={year?._id}>
                                    <span
                                        className={`year ${currYear === idx ? "selected" : ""}`}
                                        onClick={() => {
                                            dispatch(
                                                ChangeCurrentYearData(idx, course[idx].children)
                                            );
                                            dispatch(ChangeFolder(course[idx]));
                                            dispatch(RefreshCurrentFolder());
                                        }}
                                    >
                                        {year.name}
                                        {isBR && !isReadOnlyCourse ? (
                                            <div
                                                className="delete"
                                                onClick={handleDeleteYear}
                                                title="Delete Year"
                                            ></div>
                                        ) : null}
                                    </span>
                                    {isBR && !isReadOnlyCourse ? (
                                        <ConfirmDelDialog
                                            isOpen={showConfirmDel}
                                            type="delete"
                                            onConfirm={handleConfirmDeleteYear}
                                            onCancel={cancelDelete}
                                        />
                                    ) : null}
                                </div>
                            );
                        })}
                </div>
                {isBR && !isReadOnlyCourse ? (
                    <div className="year-content year add-year">
                        {course && (
                            <div>
                                <div className="">
                                    <span
                                        className=""
                                        onClick={handleAddYear}
                                        disabled={isAddingYear}
                                    >
                                        <span className="text">
                                            {isAddingYear ? "Creating..." : "New Year"}
                                        </span>
                                    </span>
                                </div>
                                <ConfirmDialog
                                    show={showConfirm}
                                    input={true}
                                    yearName={newYearName}
                                    onYearNameChange={setNewYearName}
                                    onConfirm={handleConfirmAddYear}
                                    onCancel={() => setShowConfirm(false)}
                                    confirmText="Create"
                                    cancelText="Cancel"
                                    course={course}
                                />
                            </div>
                        )}
                    </div>
                ) : null}
            </div>
        </>
    );
};

export default YearInfo;
