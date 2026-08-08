import { useState, useEffect } from "react";
import BrowseScreen from "./screens/browse";
import Dashboard from "./screens/dashboard";
import LandingPage from "./screens/landing";
import LoadingPage from "./loading.jsx";
import { BrowserRouter as Router, Routes, Route, useNavigate } from "react-router-dom";
import PrivateRoutes from "./router_utils/PrivateRoutes";
import ProfilePage from "./screens/profile.js";

import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useSelector, useDispatch } from "react-redux";
import ErrorScreen from "./screens/error";
import { LoadLocalCourses } from "./actions/user_actions";
import { migrateLegacyLocalCoursesFromSession, readLocalCoursesCache } from "./utils/frontendCache";

const App = () => {
    const [initial, setInitial] = useState(true);
    const isLoggedIn = useSelector((state) => state.user.loggedIn);
    const dispatch = useDispatch();
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth <= 768);
        };

        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get("fresh")) {
            window.location.href = "/loading";
            return;
        }

        if (!initial) return;

        try {
            const cleanedCourses = migrateLegacyLocalCoursesFromSession();
            const fromLocal = readLocalCoursesCache();
            const bootstrapCourses = cleanedCourses.length > 0 ? cleanedCourses : fromLocal;
            if (bootstrapCourses.length > 0) {
                dispatch(LoadLocalCourses(bootstrapCourses));
            }
        } catch (error) {
            console.error("Error loading local courses:", error);
        }
    }, [initial, dispatch]);

    useEffect(() => {
        if (initial && isLoggedIn) {
            setInitial(false);
        }
    }, [isLoggedIn, initial]);

    return (
        <div className="App">
            <ToastContainer
                position={isMobile ? "bottom-center" : "top-right"}
                autoClose={1500}
                hideProgressBar={false}
                newestOnTop={false}
                closeOnClick
                rtl={false}
                theme="light"
                className="toast-container"
                style={
                    isMobile
                        ? {
                              bottom: "20px",
                              left: "16px",
                              right: "16px",
                              width: "auto",
                          }
                        : {}
                }
            />
            <Router>
                <Routes>
                    <Route path="/loading" element={<LoadingPage />} />
                    <Route element={<PrivateRoutes />}>
                        <Route element={<Dashboard />} path="dashboard" exact />
                        <Route element={<ProfilePage />} path="profile" exact />
                    </Route>
                    <Route element={<BrowseScreen />} path="browse" />
                    <Route element={<BrowseScreen />} path="browse/:code" />
                    <Route element={<BrowseScreen />} path="browse/:code/:folderId" />
                    <Route element={<LandingPage />} path="/" />
                    <Route element={<ErrorScreen />} path="*" />
                </Routes>
            </Router>
        </div>
    );
};

export default App;
