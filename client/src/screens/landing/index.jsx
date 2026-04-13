import MicrosoftSignIn from "./components/microsoftbutton";
import SearchCourseButton from "./components/searchcoursebtn";
import "./styles.scss";
import { useDispatch } from "react-redux";
import { useEffect } from "react";
import { LoginUser, LogoutUser } from "../../actions/user_actions";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { getUser, handleLogin } from "../../api/User";
import AddCourseModal from "./components/searchcoursemodal";
import Loader from "../../components/Loader";
const LandingPage = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        sessionStorage.removeItem("LocalCourses");
    }, []);

    const searchCourseShowModalHandler = (event) => {
        const collection = document.getElementsByClassName("add_modal");
        const contributionSection = collection[0];
        contributionSection.classList.add("show");
    };
    useEffect(() => {
        async function getAuth() {
            try {
                const { data } = await getUser();
                if (!data) {
                    dispatch(LogoutUser());
                    setLoading(false);
                    return;
                }
                if (data.needsCourseSync) {
                    setLoading(false);
                    return navigate("/loading");
                }
                dispatch(LoginUser(data));
                setLoading(false);
                navigate(`/dashboard`);
            } catch (error) {
                dispatch(LogoutUser());
                setLoading(false);
            }
        }
        getAuth();
    }, []);

    return loading ? (
        <div
            style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                minHeight: "100vh",
                backgroundColor: "#f5f5f5",
            }}
        >
            <Loader text="Loading..." />
        </div>
    ) : (
        <>
            <section className="landing">
                <div className="top">
                    <div className="right"></div>
                </div>
                <div className="bottom">
                    <div className="content">
                        <div className="text">
                            <p>
                                Your go-to platform for all your academic needs. Get access to past
                                papers, lecture slides, assignments, tutorials, notes and more to
                                help you ace your exams
                            </p>
                        </div>
                        <div className="btn-container">
                            <MicrosoftSignIn setClicked={handleLogin} />
                            
                        </div>
                    </div>
                </div>
            </section>
            <AddCourseModal />
        </>
    );
};

export default LandingPage;
