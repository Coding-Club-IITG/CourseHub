import { BrowserRouter as Router, Outlet, Route, Routes, Link } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import RouteBoundary from "./router_utils/RouteBoundary";
import PrivateRoute from "./router_utils/PrivateRoutes";
import Sidebar from "./components/Sidebar";
import OperationNotice from "./components/OperationNotice";
import CoursesWithoutBR from "./pages/CoursesWithoutBR";
import Students from "./pages/Students";
import Courses from "./pages/Courses";
import CourseLinking from "./pages/CourseLinking";
import CourseDashboard from "./pages/CourseDashboard";
import Operations from "./pages/Operations";
import Login from "./pages/Login";
import styles from "./shell.module.scss";
function Shell() {
    return (
        <div className={styles.shell}>
            <Sidebar />
            <main id="admin-content" className={styles.main}>
                <OperationNotice />
                <Outlet />
            </main>
        </div>
    );
}
export default function App() {
    return (
        <Router>
            <div className={styles.app}>
                <a className={styles.skip} href="#admin-content">
                    Skip to content
                </a>
                <RouteBoundary>
                    <Routes>
                        <Route path="/admin/login" element={<Login />} />
                        <Route
                            element={
                                <PrivateRoute>
                                    <Shell />
                                </PrivateRoute>
                            }
                        >
                            <Route path="/admin/" element={<Students />} />
                            <Route path="/admin/students" element={<Students />} />
                            <Route path="/admin/courses" element={<Courses />} />
                            <Route path="/admin/courses/:code" element={<CourseDashboard />} />
                            <Route path="/admin/course-linking" element={<CourseLinking />} />
                            <Route
                                path="/admin/courses-without-br"
                                element={<CoursesWithoutBR />}
                            />
                            <Route path="/admin/operations" element={<Operations />} />
                            <Route
                                path="*"
                                element={
                                    <section className={styles.notFound}>
                                        <h1>Page not found</h1>
                                        <Link to="/admin/">Open Students</Link>
                                    </section>
                                }
                            />
                        </Route>
                    </Routes>
                </RouteBoundary>
                <ToastContainer position="bottom-right" autoClose={5000} />
            </div>
        </Router>
    );
}
