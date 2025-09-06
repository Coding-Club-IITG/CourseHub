import "./styles.scss";
import Container from "../../components/container";
import ExamCard from "./components/examcard";
import Heading from "../../components/heading";
import Space from "../../components/space";
import NavBar from "../../components/navbar";
import SubHeading from "../../components/subheading";
import CourseCard from "./components/coursecard";
import ContributionBanner from "./components/contributionbanner";
import QuizCard from "./components/quizcard";
import Footer from "../../components/footer";

import FavouriteCard from "./components/favouritecard";
import { getAllQuizEvents } from "../../api/Quiz";

import { ChangeCurrentCourse, ResetFileBrowserState } from "../../actions/filebrowser_actions";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";

import formatName from "../../utils/formatName";
import formatBranch from "../../utils/formatBranch";
import { useEffect, useState, useRef } from "react";
import { getColors } from "../../utils/colors";
import { LoadCourses } from "../../actions/filebrowser_actions";
import Contributions from "../contributions";
import { AddNewCourseLocal, ClearLocalCourses } from "../../actions/user_actions";
import AddCourseModal from "./components/addcoursemodal";
import { AddNewCourseAPI, GetExamDates } from "../../api/User";
import { toast } from "react-toastify";
import { getQuizEvents } from "../../api/Quiz";

const Dashboard = () => {
    const [quizzes, setQuizzes] = useState([]);
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const user = useSelector((state) => state.user);

    const [midSem, setMidSem] = useState(0);
    const [endSem, setEndSem] = useState(0);
    const [quizDate, setquizdate] = useState(0);

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
            // check if course already exists
            const found = user.user?.courses?.find(
                (course) => course.code.toLowerCase() === code.toLowerCase()
            );

            if (found) {
                toast.info("Course already exists.");
                return;
            }
            // add to user in DB
            await AddNewCourseAPI(code, name);
            location.reload();
        } catch (error) {
            // console.log(error);
        }
        // dispatch(
        //     AddNewCourseLocal({
        //         _id,
        //         name,
        //         code,
        //         color,
        //     })
        // );
    };

    useEffect(() => {
        sessionStorage.removeItem("LocalCourses");
        dispatch(ClearLocalCourses());
        if (sessionStorage.getItem("AllCourses") !== null) {
            try {
                dispatch(LoadCourses(JSON.parse(sessionStorage.getItem("AllCourses"))));
            } catch (error) {
                dispatch(LoadCourses([]));
                // console.log("load error");
            }
        }
    }, []);

    useEffect(() => {
        async function run() {
            try {
                // console.log("Exam Dates");
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
                // console.log(error);
            }
        }
        run();
    }, []);
    // 
    useEffect(() => {
        const fetchQuizzes = async () => {
            try {
                const all_quizzes = await getAllQuizEvents();
                if (!all_quizzes) {
                    console.log("Quizzes error fetching");
                    return;
                }

                console.log(all_quizzes);
                const now = Date.now();

                const user_quizzes = all_quizzes.filter((quiz) =>{
                    if(user?.user?.courses.find(course => course.code === quiz.course)){
                        if (new Date(quiz.eventDate).getTime() >= now){
                           return true;
                        }
                        else
                            return false;

                    }}
                )
                //user_quizzes.find().sort({eventDate:1})
                setQuizzes(user_quizzes);

            } catch (error) {
                console.error("Error fetching quizzes:", error);
            }
        };

        fetchQuizzes();
    }, [user]);
    useEffect(() => {
        if (quizzes.length > 0 && quizzes[0]?.eventDate) {
            const now = Date.now();

            const daysTillQuiz = Math.ceil(
                ((new Date(quizzes[0].eventDate).getTime()) - now) / (1000 * 3600 * 24)
            );
            console.log("daystill quiz:", daysTillQuiz);
            setquizdate(daysTillQuiz);
        }
    }, [quizzes]);




    const handleClick = (code) => {
        let Code = code.replaceAll(" ", "");
        dispatch(ChangeCurrentCourse(null, Code.toUpperCase()));
        navigate(`/browse/${Code.toUpperCase()}`);
    };
    // console.log(user);

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
                            {/* {midSem >= 0 && (
                                <ExamCard days={midSem} name={"Mid-Sem Exam"} color={"#FECF6F"} />
                            )} */}
                                {(quizzes.length && quizDate > 0) &&
                                    (<ExamCard days={quizDate} name={quizzes[0].course} color={"#FECF6F"} onClick={()=>{ navigate('/myquizzes')}} />)
                                }

                            {midSem > 0 ?
                                (<ExamCard days={midSem} name={"Mid-Sem Exam"} color={"#FECF6F"} />) :
                                (<ExamCard days={endSem} name={"End-Sem Exam"} color={"#FECF6F"} />)
                            }
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
                        {/* {user.localCourses.map((course) => (
                        <CourseCard
                            key={course.name}
                            code={course?.code?.toUpperCase()}
                            name={course.name}
                            color={course.color}
                            setClicked={() => handleClick(course.code)}
                        />
                    ))} */}

                        {/* <CourseCard
                            type={"ADD"}
                            setClicked={() => {
                                // dispatch(
                                //     AddNewCourseLocal({
                                //         _id: "638f1709897b3c84b7d8d32c",
                                //         name: "Introduction to Engineering Drawing",
                                //         code: "ce101",
                                //         color: "#DBCEFF",
                                //     })
                                // );
                                // console.log(user);
                                addCourseModalShowHandler();
                            }}
                        /> */}
                    </div>

                    {/* MY QUIZZES */}
                    <div className="quizzes-header">
                        <SubHeading text={"MY QUIZZES"} color={"light"} type={"bold"} />
                        <button 
                            className="view-all-quizzes-btn"
                            onClick={() => navigate('/myquizzes')}
                            title="View All Quizzes"
                        >
                            View All
                        </button>
                    </div>
                    <Space amount={20} />
                    <div className="coursecard-container">
                        {quizzes.length > 0 ? (
                            [...quizzes]
                                .sort((a, b) => new Date(a.eventDate) - new Date(b.eventDate))
                                .map((quiz, idx) => (
                                    <QuizCard
                                        key={idx}
                                        code={quiz.course}
                                        name={quiz.eventName}
                                        date={
                                            quiz.eventDate
                                                ? new Date(quiz.eventDate).toLocaleDateString()
                                                : ""
                                        }
                                        time={
                                            quiz.eventDate
                                                ? new Date(quiz.eventDate).toLocaleTimeString("en-US", {
                                                    hour: "2-digit",
                                                    minute: "2-digit",
                                                })
                                                : ""
                                        }
                                        color={getColors(idx)}
                                    />
                                ))
                        ) : (
                            <div style={{ padding: "16px", color: "#888" }}>
                                No quizzes scheduled
                            </div>
                        )}
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
                        {/* {user.localCourses.map((course) => (
                        <CourseCard
                            key={course.name}
                            code={course?.code?.toUpperCase()}
                            name={course.name}
                            color={course.color}
                            setClicked={() => handleClick(course.code)}
                        />
                    ))} */}
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
                                style={{ cursor: "pointer", display: "inline-block" }}
                            >
                                <SubHeading
                                    text={
                                        showPrevious
                                            ? "▼ HIDE PREVIOUS COURSES"
                                            : "▶ SHOW PREVIOUS COURSES"
                                    }
                                    color={"light"}
                                    type={"bold"}
                                />
                            </div>

                            {showPrevious && (
                                <>
                                    <Space amount={20} />
                                    <div className="coursecard-container">
                                        {user.user.previousCourses.map((course, index) => (
                                            <CourseCard
                                                key={course.name}
                                                code={course?.code?.toUpperCase()}
                                                name={course.name}
                                                color={getColors(index)}
                                                setClicked={() => handleClick(course.code)}
                                            />
                                        ))}

                                        {/* <CourseCard
                                            type={"ADD"}
                                            setClicked={() => {
                                                addCourseModalShowHandler();
                                            }}
                                        /> */}
                                    </div>
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
