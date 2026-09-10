import FavouriteCard from "./components/favouritecard";
import { session } from "../../session/runtime";
import { useSession } from "../../session/context";
import { normalizeCourseCode } from "@coursehub/domain";
import styles from "./styles.module.scss";
import Container from "../../components/container";
import ExamCard from "./components/examcard";
import Heading from "../../components/heading";
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

import AddCourseModal from "./components/addcoursemodal";
import { AddNewCourseAPI } from "../../api/User";
import { toast } from "../../notifications/toast";

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

    const [addCourseOpen, setAddCourseOpen] = useState(false);
    const addCourseModalShowHandler = () => setAddCourseOpen(true);
    const handleAddCourse = async ({ code, name }) => {
        try {
            const found =
                user?.courses?.find((course) => course.code.toLowerCase() === code.toLowerCase()) ||
                user?.readOnly?.find((course) => course.code.toLowerCase() === code.toLowerCase());

            if (found) {
                toast.info("Course already exists.");
                throw new Error("Course already exists.");
            }
            const res = await AddNewCourseAPI(code, name);
            session.setActor((current) => ({ ...current, readOnly: res.readOnly }));
            toast.success(`Course ${code.toUpperCase()} added to Others!`);

            setAddCourseOpen(false);
        } catch (error) {
            throw new Error(error.message || "Failed to add course.");
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
        <div className={styles.page}>
            <NavBar />
            <main>
                <Container color="dark" className="dashboard-section">
                    <div className="split">
                        <div className="welcome-container">
                            <Heading text="Welcome," color="light" />
                            <Heading text={formatName(user?.name)} type="bold" color="light" />
                            <SubHeading
                                text={formatBranch(user?.degree, user?.department)}
                                color="light"
                            />
                        </div>
                        {examQuery.data?.status !== "excluded" && (
                            <div className="exam-card-container">
                                <ExamCard query={examQuery} type="midSem" name="Mid-Sem Exam" />
                                <ExamCard query={examQuery} type="endSem" name="End-Sem Exam" />
                            </div>
                        )}
                    </div>
                    <section className={styles.courseSection} aria-labelledby="my-courses-heading">
                        <h2 id="my-courses-heading">MY COURSES</h2>
                        <div className="coursecard-container">
                            {user.courses.map((course, index) => (
                                <CourseCard
                                    key={course.code}
                                    code={course.code?.toUpperCase()}
                                    name={course.name}
                                    color={getColors(index)}
                                    setClicked={() => handleClick(course.code)}
                                />
                            ))}
                        </div>
                        {!user.courses.length && (
                            <p>
                                No registered courses yet. You can refresh them from your profile.
                            </p>
                        )}
                    </section>
                    <section
                        className={styles.courseSection}
                        aria-labelledby="other-courses-heading"
                    >
                        <h2 id="other-courses-heading">OTHERS</h2>
                        <div className="coursecard-container">
                            {(user.readOnly || []).map((course, index) => (
                                <CourseCard
                                    key={course.code}
                                    code={course.code?.toUpperCase()}
                                    name={course.name}
                                    color={getColors(index)}
                                    setClicked={() => handleClick(course.code)}
                                    isReadOnly
                                    onCourseRemoved={handleCourseRemoved}
                                />
                            ))}
                            <CourseCard type="ADD" setClicked={addCourseModalShowHandler} />
                        </div>
                    </section>
                    {user.isBR && user.previousCourses?.length > 0 && (
                        <section className={styles.courseSection} aria-label="Previous courses">
                            <button
                                className={styles.disclosure}
                                aria-expanded={showPrevious}
                                aria-controls="previous-courses"
                                onClick={() => setShowPrevious((value) => !value)}
                            >
                                <span aria-hidden="true">{showPrevious ? "▾" : "▸"}</span>
                                {showPrevious ? "HIDE PREVIOUS COURSES" : "SHOW PREVIOUS COURSES"}
                            </button>
                            <div id="previous-courses" hidden={!showPrevious}>
                                {user.previousCourses.map((group, index) => (
                                    <div className={styles.semester} key={index}>
                                        <button
                                            className={styles.disclosure}
                                            aria-expanded={!!openSemesters[index]}
                                            aria-controls={"semester-" + index}
                                            onClick={() => toggleSemester(index)}
                                        >
                                            <span aria-hidden="true">
                                                {openSemesters[index] ? "▾" : "▸"}
                                            </span>
                                            Semester {group.semester} ({group.year})
                                        </button>
                                        <div
                                            id={"semester-" + index}
                                            hidden={!openSemesters[index]}
                                        >
                                            <div className="coursecard-container">
                                                {group.courses.map((course, i) => (
                                                    <CourseCard
                                                        key={course.code}
                                                        code={course.code?.toUpperCase()}
                                                        name={course.name}
                                                        color={getColors(i)}
                                                        setClicked={() => handleClick(course.code)}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}
                </Container>
                <Container color="light" className="dashboard-section">
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
                <ContributionBanner />
            </main>
            <Footer />
            <AddCourseModal
                open={addCourseOpen}
                onOpenChange={setAddCourseOpen}
                handleAddCourse={handleAddCourse}
            />
        </div>
    );
};
export default Dashboard;
