//import "./styles.scss";
import { toast } from "react-toastify";
import { useState } from "react";
import { useSelector } from "react-redux";
import { addYear, deleteYear } from "../../../../api/Year";
import { getCourse } from "../../../../api/Course";
import { useDispatch } from "react-redux";
import {
    ChangeCurrentYearData,
    ChangeFolder,
    LoadCourses,
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
    const [newprofName, setNewProfName] = useState("");
    const [isAddingYear, setIsAddingYear] = useState(false);
    const user = useSelector((state) => state.user.user);
    const isReadOnlyCourse = user?.readOnly?.some(
        (c) => c.code.toLowerCase() === courseCode?.toLowerCase()
    );

    const sortYear = (a, b) => {
        if (a?.name > b?.name) return 1;
        else if (a?.name < b?.name) return -1;
        else return 1;
    };

    if (course?.length > 1) course.sort(sortYear);

    const handleAddYear = () => {
        setNewYearName("");
        setShowConfirm(true);
    };

    const handleConfirmAddYear = async () => {
        if (isAddingYear) return;
        setIsAddingYear(true);
        const yearName = newYearName.trim();
        const profName = newprofName.trim();

        if (!yearName) {
            setIsAddingYear(false);
            return;
        }
        // Prevent adding duplicate year names
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
            const newYear = await addYear({
                name: yearName.trim(),
                course: courseCode,
                profName: profName.trim(),
            });

            course.push(newYear);
            //dispatch(LoadCourses());
            dispatch(ChangeCurrentYearData(course.length - 1, []));
            dispatch(ChangeFolder(newYear));

            toast.success(`Year "${yearName}" added`);
        } catch (error) {
            // console.log(error);
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
            course.splice(currYear, 1);
            // dispatch(LoadCourses());
            dispatch(ChangeCurrentYearData(course.length - 1, []));
            dispatch(ChangeFolder(course[course.length - 1]));

            toast.success("Year deleted successfully!");
        } catch (err) {
            // console.log(err);
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
                                    // inputValue={newFolderName}
                                    // onInputChange={(e) => setNewFolderName(e.target.value)}
                                    yearName={newYearName}
                                    onYearNameChange={setNewYearName}
                                    profName={newprofName}
                                    onProfNameChange={setNewProfName}
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
