import Wrapper from "./components/wrapper";
import SectionC from "./components/sectionC";
import axios from "axios";

import "./styles.scss";
import Space from "../../../../components/space";
import { useState } from "react";
import { useEffect } from "react";
import { useSelector } from "react-redux";
import { GetSearchResult } from "../../../../api/Search";
import Result from "./components/result";
import SmallLoader from "../../../../components/SmallLoader";
const AddCourseModal = ({ handleAddCourse }) => {
    const [code, setCode] = useState("");
    const [btnState, setBtnState] = useState("disabled");
    const [err, setErr] = useState(null);
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const user = useSelector((state) => state.user);
    const userCourses = user.user?.courses || [];
    const previousCourses = user.user?.previousCourses?.flatMap(sem => sem.courses) || [];
    const readOnlyCourses = user.user?.readOnly || [];

    const allUserCourseCodes = [...userCourses, ...previousCourses, ...readOnlyCourses].map((c) =>
        c.code?.replace(/\s+/g, "").toLowerCase()
    );

    useEffect(() => {
        if (code.length >= 1) {
            if (btnState !== "") setBtnState("");
        } else {
            if (btnState !== "disabled") setBtnState("disabled");
        }
    }, [code]);

    async function handleSearch() {
        if (btnState === "disabled") return;
        // console.log("search");
        try {
            setLoading(true);
            setErr(null);
            let searchArr;
            if (/\d/.test(code)) {
                //if code contains number then pass it as one element array
                let codeWithoutSpace = code.replace(/\s+/g, "");
                searchArr = [codeWithoutSpace];
            } else {
                //if code does not contain number then split it and pass array of words
                searchArr = code.split(" ");
            }
            const { data } = await GetSearchResult(searchArr);
            if (data?.found === true) {
                setResults(data.results);
                setLoading(false);
                setErr(null);
            } else {
                setErr("No results found!");
                setLoading(false);
                setResults([]);
            }
            setCode("");
        } catch (error) {
            setCode("");
            setErr("Server Error! Please contact admin.");
        }
    }
    const handleModalClose = (event) => {
        const collection = document.getElementsByClassName("add_modal");
        const contributionSection = collection[0];
        contributionSection.classList.remove("show");
    };
    return (
        <SectionC>
            <Wrapper>
                <div className="head">Add New Course</div>
                <div className="info-message">This course will be read only</div>
                <div className="info-message.secondary">
                    You can either type the course code or any keyword in the name of the course
                </div>
                <form onSubmit={(e) => e.preventDefault()}>
                    <div className="course" style={{marginTop: "1.5rem"}}>
                        <label htmlFor="course" className="label_course">
                            KEY :
                        </label>
                        <input
                            placeholder="Course Code"
                            name="course"
                            className="input_course"
                            onChange={(e) => {
                                setCode(e.target.value);
                                if (results.length > 0) setResults([]);
                            }}
                            onKeyDown={(e)=>{
                                if (e.key == "Enter"){
                                    handleSearch();
                                }
                            }}
                            value={code}
                        ></input>
                    </div>
                </form>
                {err === null ? (
                    loading ? (
                        <SmallLoader text="Loading your courses..." />
                    ) : (
                        (() => {
                            const filtered = results.filter(
                                (course) =>
                                    !allUserCourseCodes.includes(
                                        course.code?.replace(/\s+/g, "").toLowerCase()
                                    )
                            );
                            if (results.length > 0 && filtered.length === 0) {
                                return "Course already exists";
                            }
                            return (
                                <div className="add-course-scroll">
                                    {filtered.map((course) => (
                                    <Result
                                        key={course._id}
                                        _id={course._id}
                                        code={course.code}
                                        name={course.name}
                                        handleClick={handleAddCourse}
                                        handleModalClose={handleModalClose}
                                    />
                                    ))}
                                </div>
                            )
                        })()
                    )
                ) : (
                    err
                )}
                <Space amount={35} />

                <div className={`button ${btnState}`} onClick={handleSearch}>
                    SEARCH CODE
                </div>
            </Wrapper>
        </SectionC>
    );
};
export default AddCourseModal;
