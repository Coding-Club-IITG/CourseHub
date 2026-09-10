import { useState } from "react";
import FolderController from "./components/folder-controller";
import styles from "./styles.module.scss";
import { useNavigate } from "react-router-dom";
import { capitalise } from "../../../../utils/capitalise";
import { normalizeCourseCode } from "@coursehub/domain";
import { useCourseBrowser } from "../../../../queries/browserContext";
const Collapsible = ({ course, color }) => {
    const navigate = useNavigate();
    const { currentYearFolderStructure: yearTree, currentCourseCode } = useCourseBrowser();
    const isCurrentCourse =
        normalizeCourseCode(currentCourseCode) === normalizeCourseCode(course.code);
    const [collapsed, setCollapsed] = useState(false);
    const open = isCurrentCourse && !collapsed;
    const onClick = () => {
        if (isCurrentCourse) setCollapsed((value) => !value);
        else {
            setCollapsed(false);
            navigate("/browse/" + normalizeCourseCode(course.code));
        }
    };
    const showTree = open && Array.isArray(yearTree);
    return (
        <div className={`${styles.root} collapsible ${open}`}>
            <div
                className="main"
                onClick={onClick}
                role="button"
                tabIndex={0}
                aria-expanded={open}
                onKeyDown={(event) => {
                    if (["Enter", " "].includes(event.key)) {
                        event.preventDefault();
                        onClick();
                    }
                }}
            >
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
                {showTree && <FolderController folders={yearTree} />}
            </div>
        </div>
    );
};

export default Collapsible;
