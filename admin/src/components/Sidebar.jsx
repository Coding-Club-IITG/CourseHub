import React from "react";
import { Link, useLocation } from "react-router-dom";
import { FaBook, FaUsers, FaLayerGroup, FaLink, FaUserGraduate, FaExclamationTriangle } from "react-icons/fa";
import { adminLogout } from "@/apis/auth";

const navItems = [
    { label: "Branch Representatives", to: "/admin/", icon: FaUsers },
    { label: "Students", to: "/admin/students", icon: FaUserGraduate },
    { label: "Courses", to: "/admin/courses", icon: FaBook },
    { label: "Course Linking", to: "/admin/course-linking", icon: FaLink },
    { label: "Courses Without BR", to: "/admin/courses-without-br", icon: FaExclamationTriangle },
];

const Sidebar = () => {
    const location = useLocation();

    const handleLogout = async () => {
        try {
            await adminLogout();
        } catch (err) {
            console.error("Logout failed", err);
        }
        window.location.href = "/admin/login";
    };

    return (
        <aside className="h-screen w-72 sticky top-0 bg-white/80 backdrop-blur-sm border-r border-gray-200/60 shadow-lg hidden md:flex md:flex-col">
            {/* Brand */}
            <div className="px-6 py-5 border-b border-gray-200/60">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-md">
                        <FaLayerGroup className="h-5 w-5 text-white" />
                    </div>
                    <div>
                        <div className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                            Admin
                        </div>
                        <div className="text-xs text-gray-500">CourseHub</div>
                    </div>
                </div>
            </div>

            {/* Nav */}
            <nav className="flex-1 overflow-y-auto px-3 py-4">
                <ul className="space-y-1.5">
                    {navItems.map(({ label, to, icon: Icon }) => {
                        const isActive = location.pathname === to;
                        return (
                            <li key={to}>
                                <Link
                                    to={to}
                                    className={`group flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 border ${
                                        isActive
                                            ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white border-blue-600 shadow-md"
                                            : "bg-white/70 hover:bg-blue-50/80 text-gray-700 border-gray-200/60"
                                    }`}
                                >
                                    <Icon
                                        className={`h-4 w-4 ${
                                            isActive
                                                ? "text-white"
                                                : "text-blue-700/70 group-hover:text-blue-800"
                                        }`}
                                    />
                                    <span className="text-sm font-medium">{label}</span>
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            </nav>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-200/60 text-xs text-gray-500 flex items-center justify-between">
                <span>© {new Date().getFullYear()} CourseHub</span>
                <button
                    onClick={handleLogout}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                >
                    Logout
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
