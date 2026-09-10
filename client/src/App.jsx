import styles from "./App.module.scss";
import UploadDialogProvider from "./screens/contributions/UploadDialogProvider";
import ShareProvider from "./screens/share/ShareProvider";
import RouteBoundary from "./router_utils/RouteBoundary";
import BrowseScreen from "./screens/browse";
import Dashboard from "./screens/dashboard";
import LandingPage from "./screens/landing";
import LoadingPage from "./loading.jsx";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import PrivateRoutes from "./router_utils/PrivateRoutes";
import ProfilePage from "./screens/profile.js";

import Notifications from "./notifications";
import ErrorScreen from "./screens/error";

const App = () => {
    return (
        <div className={styles.app}>
            <Notifications>
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
            </Notifications>
        </div>
    );
};

export default App;
