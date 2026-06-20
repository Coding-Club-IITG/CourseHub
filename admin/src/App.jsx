import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import BranchRepresentatives from "./pages/BranchRepresentatives";
import Students from "./pages/Students";
import Courses from "./pages/Courses";
import CourseLinking from "./pages/CourseLinking";
import PrivateRoute from "./router_utils/PrivateRoutes";
import Login from "./pages/Login";
import CourseDashboard from "./pages/CourseDashboard";

function App() {
    return (
        <Router>
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
                <div className="mx-auto flex">
                    <Sidebar />
                    <main className="flex-1 min-h-screen">
                        <Routes>
                            <Route path = "/courses/:code" element = {<CourseDashboard/>}/>
                            <Route path="/admin/login" element={<Login />} />
                            <Route
                                path="/admin/"
                                element={
                                    <PrivateRoute>
                                        <BranchRepresentatives />
                                    </PrivateRoute>
                                }
                            />
                            <Route
                                path="/admin/students"
                                element={
                                    <PrivateRoute>
                                        <Students />
                                    </PrivateRoute>
                                }
                            />
                            <Route
                                path="/admin/courses"
                                element={
                                    <PrivateRoute>
                                        <Courses />
                                    </PrivateRoute>
                                }
                            />
                            <Route
                                path="/admin/course-linking"
                                element={
                                    <PrivateRoute>
                                        <CourseLinking />
                                    </PrivateRoute>
                                }
                            />
                            <Route
                                path="*"
                                element={
                                    <div className="p-10">
                                        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/60 p-10">
                                            Page Not Found
                                        </div>
                                    </div>
                                }
                            />
                        </Routes>
                    </main>
                </div>
            </div>
        </Router>
    );
}

export default App;