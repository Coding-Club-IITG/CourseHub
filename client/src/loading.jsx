import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getUser } from "./api/User";
import { fetchUserCoursesData } from "./api/Course";
import { toast } from "react-toastify";
import "./loading.css";
import { LoginUser } from "./actions/user_actions";
import { useDispatch } from "react-redux";

const LoadingPage = () => {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const [error, setError] = useState(null);

    useEffect(() => {
        async function loadData() {
            let user;
            try {
                const { data } = await getUser();
                user = data;
            } catch (err) {
                console.error("Failed to fetch user:", err);
                toast.error("Session expired. Please log in again.");
                setError("Session expired.");
                return navigate("/");
            }

            if (!user || !user.rollNumber) {
                toast.error("Invalid user data. Please log in again.");
                setError("Invalid user data.");
                return navigate("/");
            }

            try {
                const { courses, previousCourses } = await fetchUserCoursesData(user);
                user.courses = courses;
                user.previousCourses = previousCourses;
            } catch (err) {
                console.error("Failed to fetch courses:", err);
                user.courses = user.courses || [];
                user.previousCourses = user.previousCourses || [];
            }

            dispatch(LoginUser(user));
            navigate("/dashboard");
        }

        loadData();
    }, [dispatch, navigate]);

    return (
        <div className="loading-page">
            
            <div className="loader"></div>

            
            <div className="loading-text">
                <h2>Fetching your courses</h2>
                <h2>This may take up to a minute</h2>
            </div>
        </div>
    );
};

export default LoadingPage;
