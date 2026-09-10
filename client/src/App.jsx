import styles from "./App.module.scss";
import UploadDialogProvider from "./screens/contributions/UploadDialogProvider";
import ShareProvider from "./screens/share/ShareProvider";
import RouteBoundary from "./router_utils/RouteBoundary";
import { useState, useEffect } from "react";
import BrowseScreen from "./screens/browse";
import Dashboard from "./screens/dashboard";
import LandingPage from "./screens/landing";
import LoadingPage from "./loading.jsx";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import PrivateRoutes from "./router_utils/PrivateRoutes";
import ProfilePage from "./screens/profile.js";

import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import ErrorScreen from "./screens/error";

const App = () => {
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth <= 768);
        };

        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    return (
        <div className={styles.app}>
            <ToastContainer
                position={isMobile ? "bottom-center" : "top-right"}
                autoClose={1500}
                hideProgressBar={false}
                newestOnTop={false}
                closeOnClick
                draggable
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
                <UploadDialogProvider>
                    <ShareProvider>
                        <RouteBoundary>
                            <Routes>
                                <Route path="/loading" element={<LoadingPage />} />
                                <Route element={<PrivateRoutes />}>
                                    <Route element={<Dashboard />} path="dashboard" />
                                    <Route element={<ProfilePage />} path="profile" />
                                    <Route element={<BrowseScreen />} path="browse" />
                                    <Route element={<BrowseScreen />} path="browse/:code" />
                                    <Route
                                        element={<BrowseScreen />}
                                        path="browse/:code/:folderId"
                                    />
                                </Route>
                                <Route element={<LandingPage />} path="/" />
                                <Route element={<ErrorScreen />} path="*" />
                            </Routes>
                        </RouteBoundary>
                    </ShareProvider>
                </UploadDialogProvider>
            </Router>
        </div>
    );
};

export default App;
