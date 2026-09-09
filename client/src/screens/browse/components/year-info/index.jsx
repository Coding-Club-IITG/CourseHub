import { useSession } from "../../../../session/context";
import { library } from "../../../../session/runtime";
import { canManageCourse } from "../../../../utils/capabilities";
import { toast } from "react-toastify";
import { useState } from "react";
import { addYear, deleteYear } from "../../../../api/Year";

import { ConfirmDialog } from "./confirmDialog";
import { ConfirmDelDialog } from "./confirmDelDialog";
import { getSubtreeFileCount } from "../../../../utils/folderUtils";
import { useNavigate } from "react-router-dom";

const YearInfo = ({
    courseCode,
    course, // years list
    currYear,
}) => {
    const navigate = useNavigate();
    const [showConfirm, setShowConfirm] = useState(false);
    const [showConfirmDel, setShowConfirmDel] = useState(false);
    const [newYearName, setNewYearName] = useState("");
    const [isAddingYear, setIsAddingYear] = useState(false);
    const [isDeletingYear, setIsDeletingYear] = useState(false);
    const user = useSession().data;
    const canManage = canManageCourse(user, courseCode);

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
            const selectedYearId = course?.[currYear]?._id;
            const created = await addYear({ name: yearName, course: courseCode });
            await library.invalidate([courseCode]);
            navigate(
                "/browse/" +
                    courseCode +
                    (selectedYearId || created?._id ? "/" + (selectedYearId || created._id) : ""),
            );
            toast.success(`Year "${yearName}" added`);
        } catch {
            toast.error("Failed to add year.");
        }
        setShowConfirm(false);
        setIsAddingYear(false);
    };

    const handleDeleteYear = () => {
        setShowConfirmDel(true);
    };

    const handleConfirmDeleteYear = async () => {
        if (isDeletingYear) return;
        try {
            setIsDeletingYear(true);
            await deleteYear({
                folderId: course[currYear]._id,
                courseCode: courseCode,
            });

            await library.invalidate([courseCode]);
            navigate("/browse/" + courseCode);
            toast.success("Year deleted successfully!");
            setShowConfirmDel(false);
        } catch {
            toast.error("Failed to delete year.");
        } finally {
            setIsDeletingYear(false);
        }
    };

    const cancelDelete = () => {
        if (isDeletingYear) return;
        setShowConfirmDel(false);
    };

    return (
        <>
            <div>
                <div className="year-content">
                    {course &&
                        course.map((year, idx) => {
                            const fileCount = getSubtreeFileCount(year);
                            const isEmpty = fileCount === 0;

                            return (
                                <div key={year?._id}>
                                    <span
                                        className={`year ${currYear === idx ? "selected" : ""}`}
                                        onClick={() => {
                                            if (courseCode && course[idx]?._id) {
                                                navigate(
                                                    `/browse/${courseCode}/${course[idx]._id}`,
                                                );
                                            } else if (courseCode) {
                                                navigate(`/browse/${courseCode}`);
                                            }
                                        }}
                                    >
                                        <div className="year-title-wrapper">
                                            <span>{year.name}</span>
                                            {isEmpty && (
                                                <span
                                                    className="empty-indicator"
                                                    title="This year contains no files"
                                                >
                                                    EMPTY
                                                </span>
                                            )}
                                        </div>
                                        {canManage ? (
                                            <div
                                                className="delete"
                                                onClick={handleDeleteYear}
                                                title="Delete Year"
                                            ></div>
                                        ) : null}
                                    </span>
                                    {canManage ? (
                                        <ConfirmDelDialog
                                            affectedCourses={course?.[currYear]?.affectedCourses}
                                            courseCode={courseCode}
                                            isOpen={showConfirmDel}
                                            type="delete"
                                            onConfirm={handleConfirmDeleteYear}
                                            onCancel={cancelDelete}
                                            isLoading={isDeletingYear}
                                        />
                                    ) : null}
                                </div>
                            );
                        })}
                </div>
                {canManage ? (
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
