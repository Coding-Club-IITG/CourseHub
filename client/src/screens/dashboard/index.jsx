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
import { AddNewCourseAPI, GetCourseUpdates, GetExamDates } from "../../api/User";
import { toast } from "react-toastify";

const Dashboard = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector((state) => state.user);

  const [midSem, setMidSem] = useState(0);
  const [endSem, setEndSem] = useState(0);

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
      console.log(error);
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
    if (localStorage.getItem("AllCourses") !== null) {
      try {
        dispatch(LoadCourses(JSON.parse(localStorage.getItem("AllCourses"))));
      } catch (error) {
        dispatch(LoadCourses([]));
        console.log("load error");
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
        console.log(error);
      }
    }
    run();
  }, []);

  const handleClick = (code) => {
    dispatch(ChangeCurrentCourse(null, code.toUpperCase()));
    navigate("/browse");
  };
  // console.log(user);

  useEffect(() => {
    dispatch(ResetFileBrowserState());
  }, []);

  // useEffect(() => {
  //   // dispatch(ResetFileBrowserState());
  //   async function run() {
  //     const { data } = await GetCourseUpdates();
  //   }
  //   run();
  // }, []);

  return (
    <div className="App">
      <div>
        <NavBar />
        <Container color={"dark"}>
          <Space amount={20} />
          <div className="split">
            <div>
              <Heading text={"Welcome,"} type={""} color={"light"} />
              <Heading text={formatName(user?.user?.name)} type={"bold"} color={"light"} />
              <SubHeading
                text={formatBranch(user?.user?.degree, user?.user?.department)}
                color={"light"}
              />
            </div>

            <div className="exam-card-container">
              {midSem >= 0 && <ExamCard days={midSem} name={"Mid-Sem Exam"} color={"#FECF6F"} />}
              {endSem >= 0 && <ExamCard days={endSem} name={"End-Sem Exam"} color={"#FECF6F"} />}
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
            />
          </div>
          <Space amount={50} />
        </Container>
        <ContributionBanner contributionHandler={contributionHandler} />
        <Space amount={50} />
        <Container>
          <SubHeading text={"MY FAVOURITES"} type={"bold"} />
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
              <div className="no-fav-graphic"></div>
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
