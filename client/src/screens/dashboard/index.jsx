import FavouriteCard from "./components/favouritecard";
import { session } from "../../session/runtime";
import { useSession } from "../../session/context";
import { normalizeCourseCode } from "@coursehub/domain";
import "./styles.scss";
import Container from "../../components/container";
import ExamCard from "./components/examcard";
import Heading from "../../components/heading";
import Space from "../../components/space";
import NavBar from "../../components/navbar";
import SubHeading from "../../components/subheading";
import CourseCard from "./components/coursecard";
import ContributionBanner from "./components/contributionbanner";
import Footer from "../../components/footer";

import ExamScheduleWidget from "./components/examschedule";
import { useExamSchedule } from "../../queries/exams";

import { useNavigate } from "react-router-dom";

import formatName from "../../utils/formatName";
import formatBranch from "../../utils/formatBranch";
import { useState } from "react";
import { getColors } from "../../utils/colors";

import Contributions from "../contributions";
import AddCourseModal from "./components/addcoursemodal";
import { AddNewCourseAPI } from "../../api/User";
import { toast } from "react-toastify";

const Dashboard = () => {
    const navigate = useNavigate();
    const user = useSession().data;

    const examQuery = useExamSchedule();
    const [openSemesters, setOpenSemesters] = useState({});

    const toggleSemester = (semIndex) => {
        setOpenSemesters((prev) => ({
            ...prev,
            [semIndex]: !prev[semIndex],
        }));
    };

    const contributionHandler = () => {
        const collection = document.getElementsByClassName("contri");
        const contributionSection = collection[0];
        if (contributionSection) contributionSection.classList.add("show");
    };
    const addCourseModalShowHandler = () => {
        const collection = document.getElementsByClassName("add_modal");
        const contributionSection = collection[0];
        if (contributionSection) contributionSection.classList.add("show");
    };
    const handleAddCourse = async ({ code, name }) => {
        try {
            const found =
                user?.courses?.find((course) => course.code.toLowerCase() === code.toLowerCase()) ||
                user?.readOnly?.find((course) => course.code.toLowerCase() === code.toLowerCase());

            if (found) {
                toast.info("Course already exists.");
                return;
            }
            const res = await AddNewCourseAPI(code, name);
            session.setActor((current) => ({ ...current, readOnly: res.readOnly }));
            toast.success(`Course ${code.toUpperCase()} added to Others!`);

            const collection = document.getElementsByClassName("add_modal");
            const modal = collection[0];
            if (modal) modal.classList.remove("show");
        } catch {
            toast.error("Failed to add course.");
        }
    };

    const handleCourseRemoved = (removedCode) => {
        if (!removedCode) return;
        const normalizedRemoved = normalizeCourseCode(removedCode);
        const updatedReadOnly = (user?.readOnly || []).filter(
            (c) => normalizeCourseCode(c.code) !== normalizedRemoved,
        );
        session.setActor((current) => ({ ...current, readOnly: updatedReadOnly }));
        toast.success(`Course ${removedCode.toUpperCase()} removed`);
    };

    const handleClick = (code) => {
        let Code = code.replaceAll(" ", "");

        navigate(`/browse/${Code.toUpperCase()}`);
    };

    const [showPrevious, setShowPrevious] = useState(false);

    return (
        <div className="App dashboard-page">
            <div>
                <NavBar />
                <Container color={"dark"} className="dashboard-section">
                    <div className="split">
                        <div className="welcome-container">
                            <Heading text={"Welcome,"} type={""} color={"light"} />
                            <Heading text={formatName(user?.name)} type={"bold"} color={"light"} />
                            <SubHeading
                                text={formatBranch(user?.degree, user?.department)}
                                color={"light"}
                            />
                        </div>

                        {examQuery.data?.status !== "excluded" && (
                            <div className="exam-card-container">
                                <ExamCard query={examQuery} type="midSem" name="Mid-Sem Exam" />
                                <ExamCard query={examQuery} type="endSem" name="End-Sem Exam" />
                            </div>
                        )}
                    </div>
                    <Space amount={50} />
                    <SubHeading text={"MY COURSES"} color={"light"} type={"bold"} />
                    <Space amount={20} />
                    <div className="coursecard-container">
                        {user.courses.map((course, index) => (
                            <CourseCard
                                key={course.name}
                                code={course?.code?.toUpperCase()}
                                name={course.name}
                                color={getColors(index)}
                                setClicked={() => handleClick(course.code)}
                                isReadOnly={false}
                            />
                        ))}
                    </div>
                    <Space amount={50} />

                    <SubHeading text={"OTHERS"} color={"light"} type={"bold"} />
                    <Space amount={20} />
                    <div className="coursecard-container">
                        {(user?.readOnly || []).map((course, index) => (
                            <CourseCard
                                key={course.code || course.name}
                                code={course?.code?.toUpperCase()}
                                name={course.name}
                                color={getColors(index)}
                                setClicked={() => handleClick(course.code)}
                                isReadOnly={true}
                                onCourseRemoved={handleCourseRemoved}
                            />
                        ))}

                        <CourseCard
                            type={"ADD"}
                            setClicked={() => {
                                addCourseModalShowHandler();
                            }}
                        />
                    </div>

                    <Space amount={50} />

                    {user.isBR && user.previousCourses?.length > 0 && (
                        <>
                            <div
                                onClick={() => setShowPrevious(!showPrevious)}
                                style={{
                                    cursor: "pointer",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "8px",
                                }}
                            >
                                <span
                                    style={{
                                        transition: "transform 0.2s",
                                        transform: showPrevious ? "rotate(0deg)" : "rotate(-90deg)",
                                        color: "white",
                                        fontSize: "0.85em",
                                    }}
                                >
                                    ▼
                                </span>
                                <SubHeading
                                    text={
                                        showPrevious
                                            ? "HIDE PREVIOUS COURSES"
                                            : "SHOW PREVIOUS COURSES"
                                    }
                                    color={"light"}
                                    type={"bold"}
                                />
                            </div>

                            {showPrevious && (
                                <div className="previous-courses-wrapper">
                                    {user.previousCourses.map((semesterGroup, semIndex) => (
                                        <div key={semIndex} style={{ marginLeft: "20px" }}>
                                            <Space amount={20} />
                                            <div
                                                style={{
                                                    cursor: "pointer",
                                                    display: "inline-flex",
                                                    alignItems: "center",
                                                    gap: "8px",
                                                }}
                                                onClick={() => toggleSemester(semIndex)}
                                            >
                                                <span
                                                    style={{
                                                        transition:
                                                            "transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)",
                                                        transform: openSemesters[semIndex]
                                                            ? "rotate(0deg)"
                                                            : "rotate(-90deg)",
                                                        color: "white",
                                                        fontSize: "0.85em",
                                                    }}
                                                >
                                                    ▼
                                                </span>
                                                <SubHeading
                                                    text={`Semester ${semesterGroup.semester} (${semesterGroup.year})`}
                                                    color={"light"}
                                                    type={"bold"}
                                                />
                                            </div>
                                            {openSemesters[semIndex] && (
                                                <div className="previous-courses-wrapper">
                                                    <Space amount={20} />
                                                    <div className="coursecard-container">
                                                        {semesterGroup.courses.map(
                                                            (course, index) => (
                                                                <CourseCard
                                                                    key={course.name}
                                                                    code={course?.code?.toUpperCase()}
                                                                    name={course.name}
                                                                    color={getColors(index)}
                                                                    setClicked={() =>
                                                                        handleClick(course.code)
                                                                    }
                                                                />
                                                            ),
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </Container>
                <Container color={"light"} className="dashboard-section">
                    <section className="favourites-section" aria-labelledby="favourites-heading">
                        <h2 id="favourites-heading">Favourites</h2>
                        {user.favourites?.length ? (
                            <div className="favourites-grid">
                                {user.favourites.map((favourite) => (
                                    <FavouriteCard key={favourite._id} favourite={favourite} />
                                ))}
                            </div>
                        ) : (
                            <p>No favourites yet. Use the star on a file to save it here.</p>
                        )}
                    </section>
                </Container>
                <ExamScheduleWidget query={examQuery} />
                <ContributionBanner contributionHandler={contributionHandler} />
            </div>
            <div>
                <Footer />
            </div>
            <Contributions />
            <AddCourseModal handleAddCourse={handleAddCourse} />
        </div>
    );
};

export default Dashboard;
