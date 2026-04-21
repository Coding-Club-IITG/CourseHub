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
import FavouriteCard from "./components/favouritecard";

import { ChangeCurrentCourse, ResetFileBrowserState } from "../../actions/filebrowser_actions";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";

import formatName from "../../utils/formatName";
import formatBranch from "../../utils/formatBranch";
import { useEffect, useState } from "react";
import { getColors } from "../../utils/colors";
import { LoadCourses } from "../../actions/filebrowser_actions";
import Contributions from "../contributions";
import { AddNewCourseLocal, ClearLocalCourses } from "../../actions/user_actions";
import AddCourseModal from "./components/addcoursemodal";
import { AddNewCourseAPI, GetExamDates } from "../../api/User";
import { toast } from "react-toastify";
import { clearLegacySessionLocalCoursesCache, readAllCoursesCache } from "../../utils/frontendCache";

const Dashboard = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const user = useSelector((state) => state.user);

    const [midSem, setMidSem] = useState(0);
    const [endSem, setEndSem] = useState(0);
    const [openSemesters, setOpenSemesters] = useState({});

    const toggleSemester = (semIndex) => {
        setOpenSemesters((prev) => ({
            ...prev,
            [semIndex]: !prev[semIndex]
        }));
    };

    const contributionHandler = (event) => {
        const collection = document.getElementsByClassName("contri");
        const contributionSection = collection[0];
        contributionSection.classList.add("show");
    };
    const addCourseModalShowHandler = (event) => {
        const collection = document.getElementsByClassName("add_modal");
        const contributionSection = collection[0];
        contributionSection.classList.add("show");
    };
    const handleAddCourse = async ({ code, name }) => {
        try {
            const found = user.user?.courses?.find(
                (course) => course.code.toLowerCase() === code.toLowerCase()
            );

            if (found) {
                toast.info("Course already exists.");
                return;
            }
            await AddNewCourseAPI(code, name);
            location.reload();
        } catch (error) {
        }
    };

    useEffect(() => {
        clearLegacySessionLocalCoursesCache();
        dispatch(ClearLocalCourses());
        const cleaned = readAllCoursesCache();
        if (cleaned.length > 0) {
            dispatch(LoadCourses(cleaned));
        }
    }, []);

    useEffect(() => {
        async function run() {
            try {
                const { data } = await GetExamDates();
                const { dates } = data;
                const midSemDate = new Date(dates.midSem);
                const endSemDate = new Date(dates.endSem);
                const now = Date.now();
                const daysTillMidsem = parseInt((midSemDate.getTime() - now) / (1000 * 3600 * 24));
                setMidSem(daysTillMidsem);
                const daysEndSem = parseInt((endSemDate.getTime() - now) / (1000 * 3600 * 24));
                setEndSem(daysEndSem);
            } catch (error) {
            }
        }
        run();
    }, []);

    const handleClick = (code) => {
        let Code = code.replaceAll(" ", "");
        dispatch(ChangeCurrentCourse(null, Code.toUpperCase()));
        navigate(`/browse/${Code.toUpperCase()}`);
    };

    useEffect(() => {
        dispatch(ResetFileBrowserState());
    }, []);

    const [showPrevious, setShowPrevious] = useState(false);

    return (
        <div className="App">
            <div>
                <NavBar />
                <Container color={"dark"}>
                    <Space amount={20} />
                    <div className="split">
                        <div className="welcome-container">
                            <Heading text={"Welcome,"} type={""} color={"light"} />
                            <Heading
                                text={formatName(user?.user?.name)}
                                type={"bold"}
                                color={"light"}
                            />
                            <SubHeading
                                text={formatBranch(user?.user?.degree, user?.user?.department)}
                                color={"light"}
                            />
                        </div>

                        <div className="exam-card-container">
                            {midSem >= 0 && (
                                <ExamCard days={midSem} name={"Mid-Sem Exam"} color={"#FECF6F"} />
                            )}
                            {endSem >= 0 && (
                                <ExamCard days={endSem} name={"End-Sem Exam"} color={"#FECF6F"} />
                            )}
                        </div>
                    </div>
                    <Space amount={50} />
                    <SubHeading text={"MY COURSES"} color={"light"} type={"bold"} />
                    <Space amount={20} />
                    <div className="coursecard-container">
                        {user.user.courses.map((course, index) => (
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
                        {user.user.readOnly.map((course, index) => (
                            <CourseCard
                                key={course.name}
                                code={course?.code?.toUpperCase()}
                                name={course.name}
                                color={getColors(index)}
                                setClicked={() => handleClick(course.code)}
                                isReadOnly={true}
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

                    {user.user.isBR && user.user.previousCourses?.length > 0 && (
                        <>
                            <div
                                onClick={() => setShowPrevious(!showPrevious)}
                                style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "8px" }}
                            >
                                <span style={{ transition: "transform 0.2s", transform: showPrevious ? "rotate(0deg)" : "rotate(-90deg)", color: "white", fontSize: "0.85em" }}>
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
                                <>
                                    {user.user.previousCourses.map((semesterGroup, semIndex) => (
                                        <div key={semIndex} style={{ marginLeft: "20px" }}>
                                            <Space amount={20} />
                                            <div style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "8px" }} onClick={() => toggleSemester(semIndex)}>
                                                <span style={{ transition: "transform 0.2s", transform: openSemesters[semIndex] ? "rotate(0deg)" : "rotate(-90deg)", color: "white", fontSize: "0.85em" }}>
                                                    ▼
                                                </span>
                                                <SubHeading 
                                                    text={`Semester ${semesterGroup.semester} (${semesterGroup.year})`} 
                                                    color={"light"} 
                                                    type={"bold"} 
                                                />
                                            </div>
                                            {openSemesters[semIndex] && (
                                                <>
                                                    <Space amount={20} />
                                                    <div className="coursecard-container">
                                                        {semesterGroup.courses.map((course, index) => (
                                                            <CourseCard
                                                                key={course.name}
                                                                code={course?.code?.toUpperCase()}
                                                                name={course.name}
                                                                color={getColors(index)}
                                                                setClicked={() => handleClick(course.code)}
                                                            />
                                                        ))}
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    ))}
                                </>
                            )}
                        </>
                    )}
                    <Space amount={50} />
                </Container>
                <ContributionBanner contributionHandler={contributionHandler} />
                <Space amount={50} />
                <Container>
                    <SubHeading text={"MY FAVOURITES"} type={"bold"} algn={"center"} />
                    <div className="fav-container">
                        {user?.favourites?.length > 0 ? (
                            user.favourites.map((favourite) => (
                                <FavouriteCard
                                    name={favourite.name}
                                    path={favourite.path}
                                    key={favourite.id}
                                    code={favourite.code}
                                    id={favourite.id}
                                    _id={favourite._id}
                                />
                            ))
                        ) : (
                            <>
                                <div className="favorites-coming-soon">Coming Soon!</div>
                                <div className="no-fav-graphic"></div>
                            </>
                        )}
                    </div>
                </Container>
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
