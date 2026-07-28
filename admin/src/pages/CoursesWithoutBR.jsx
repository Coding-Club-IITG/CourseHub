import React, { useState, useEffect } from "react";
import CoursesWithoutBRTable from "../components/coursesWithoutBRTable";
import { fetchCoursesWithoutBR } from "@/apis/br";

export default function CoursesWithoutBR() {
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const loadCourses = async () => {
        try {
            setLoading(true);
            const response = await fetchCoursesWithoutBR();
            setCourses(response.coursesWithoutBR);
            setLoading(false);
        } catch (err) {
            setError(err.message || "An error occurred while fetching courses without BR.");
            setLoading(false);
        }
    };

    useEffect(() => {
        loadCourses();
    }, []);

    return (
        <div className="p-6 space-y-6">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/60 p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Courses Without BR</h1>
                    <p className="text-gray-600 mt-1">
                        Courses that don't have a branch representative assigned yet
                    </p>
                </div>
            </div>

            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/60 p-6">
                {loading && <p>Loading...</p>}
                {error && <p className="text-red-500">{error}</p>}
                {!loading && !error && <CoursesWithoutBRTable courses={courses} />}
            </div>
        </div>
    );
}
