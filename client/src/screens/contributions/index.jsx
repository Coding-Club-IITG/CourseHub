import Wrapper from "./components/wrapper";
import SectionC from "./components/sectionC";
import axios from "axios";
import { FilePond, registerPlugin } from "react-filepond";
import "filepond/dist/filepond.min.css";
import { useEffect, useRef, useState } from "react";
import Footer from "../../components/footer";
import Cookies from "js-cookie";
import ToggleSwitch from "./components/ToggleSwitch";
import "./styles.scss";
import { v4 as uuidv4 } from "uuid";
import { CreateNewContribution } from "../../api/Contribution";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";
import googleFormLink from "../../api/googleFormLink";
const Contributions = () => {
    const uploadedBy = useSelector((state) => state.user.user._id);
    const userName = useSelector((state) => state.user.user.name);
    const [contributionId, setContributionId] = useState("");
    useEffect(() => {
        setContributionId(uuidv4());
    }, []);

    const [courseCode, setCourseCode] = useState(null);
    const [folder, setFolder] = useState("Lecture Slides");
    const [description, setDescription] = useState(null);
    const [year, setYear] = useState("2022");
    const [submitEnabled, setSubmitEnabled] = useState(false);

    useEffect(() => {
        if (!courseCode || !folder || !year || !description || courseCode?.length < 3) {
            setSubmitEnabled(false);
            return;
        }
        setSubmitEnabled(true);
    }, [courseCode, folder, description, year]);

    // const [contributionId, setContributionId] = useState("");

    let pond = useRef();

    async function handleSubmit() {
        if (!courseCode || !folder || !year || !description) {
            toast.error("Please fill the complete form.");
            return;
        }
        if (courseCode?.length < 3) {
            toast.error("Invalid course code length!");
            return;
        }
        // console.log(courseCode, folder, description, year);
        await pond.processFiles();
        const collection = document.getElementsByClassName("contri");
        const contributionSection = collection[0];
        pond.removeFiles();
        const toggle = document.getElementById("toggle");
        // console.log(toggle);
        let isAnoynmous = toggle.checked;
        // console.log(isAnoynmous);

        try {
            setSubmitEnabled(false);
            if (isAnoynmous) {
                let resp = await CreateNewContribution({
                    courseCode,
                    folder,
                    description,
                    year,
                    approved: false,
                    contributionId,
                    uploadedBy: `63ef67f7ab9bcbea9195147c`,
                });
                // console.log(resp);
            } else {
                let resp = await CreateNewContribution({
                    courseCode,
                    folder,
                    description,
                    year,
                    approved: false,
                    contributionId,
                    uploadedBy,
                });
                // console.log(resp);
            }
            contributionSection.classList.remove("show");
            toast.success("Files uploaded successfully!");
            setContributionId(uuidv4());
            setSubmitEnabled(true);
        } catch (error) {
            setSubmitEnabled(true);
            contributionSection.classList.remove("show");
            toast.error("Failed to upload! Please try again.");
            console.log(error);
        }
    }
    return (
        <SectionC>
            <Wrapper>
                <div className="head">Contribute to CourseHub</div>
                <form>
                    <div className="course">
                        <label htmlFor="course" className="label_course">
                            COURSE CODE :
                        </label>
                        <input
                            placeholder="Course Code"
                            name="course"
                            className="input_course"
                            value={courseCode}
                            onChange={(e) => setCourseCode(e.target.value)}
                        ></input>
                    </div>
                    <div className="section">
                        <label htmlFor="section" className="label_section">
                            SECTION :
                        </label>
                        <select
                            name="section"
                            className="select_section"
                            onChange={(e) => setFolder(e.target.value)}
                        >
                            <option value="Books">Books</option>
                            <option value="Lecture Slides">Lecture Slides</option>
                            <option value="Tutorials">Tutorials</option>
                            <option value="Exams">Exams</option>
                            <option value="Notes">Notes</option>
                            <option value="Assignments">Assignments</option>
                        </select>
                    </div>
                    <div className="year">
                        <label htmlFor="year" className="label_year">
                            YEAR :
                        </label>
                        <select
                            name="year"
                            className="select_year"
                            onChange={(e) => setYear(e.target.value)}
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke-width="1.5"
                                stroke="currentColor"
                                class="w-6 h-6"
                            >
                                <path
                                    strokeLinecap="round"
                                    stroke-linejoin="round"
                                    d="M19.5 8.25l-7.5 7.5-7.5-7.5"
                                />
                            </svg>
                            <option value="2022">2023</option>
                            <option value="2022">2022</option>
                            <option value="2022">2021</option>
                            <option value="2022">2020</option>
                            <option value="2019">2019</option>
                            <option value="2018">2018</option>
                            <option value="2017">2017</option>
                            <option value="2022">2016</option>
                            <option value="2022">2015</option>
                            <option value="2022">2014</option>
                            <option value="2022">2013</option>
                            <option value="2022">2012</option>
                        </select>
                    </div>
                    <div className="description">
                        <label htmlFor="description" className="label_description">
                            DESCRIPTION :
                        </label>
                        <textarea
                            name="description"
                            className="input_description"
                            placeholder="Give a brief description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        ></textarea>
                    </div>
                    <div className="year">
                        <label htmlFor="course" className="label_year">
                            ANNOYOMOUS:
                        </label>
                        <span className="toggle-container">
                            <ToggleSwitch label={"toggle"} />
                        </span>
                    </div>
                </form>
                <div className="file_pond">
                    <FilePond
                        allowMultiple={true}
                        maxFiles={40}
                        server={{
                            url: "http://localhost:8080/api/contribution/upload",
                            process: {
                                headers: {
                                    "contribution-id": contributionId,
                                    username: userName,
                                },
                            },
                        }}
                        instantUpload={false}
                        ref={(ref) => {
                            pond = ref;
                        }}
                    />
                </div>
                <div className="uploaded">
                    {/* <span>UPLOADED:</span> folder/file */}
                    Or submit link on{" "}
                    <a href={googleFormLink} target="_blank">
                        Google forms.
                    </a>
                </div>
                <div className={`button ${submitEnabled}`} onClick={handleSubmit}>
                    SUBMIT
                </div>
            </Wrapper>
        </SectionC>
    );
};
export default Contributions;
