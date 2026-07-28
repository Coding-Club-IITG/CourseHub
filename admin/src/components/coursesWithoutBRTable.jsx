import React from "react";

const CoursesWithoutBRTable = ({ courses }) => {
    return (
        <div className="p-6 bg-white rounded-lg shadow-md">
            <div className="flex items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Courses Without BR</h2>
            </div>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700">
                                Code
                            </th>
                            <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700">
                                Name
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {courses.map((course) => (
                            <tr key={course._id || course.code} className="hover:bg-gray-50 transition">
                                <td className="py-4 px-4 text-sm font-medium text-gray-900">
                                    {course.code}
                                </td>
                                <td className="py-4 px-4 text-sm text-gray-600">{course.name}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default CoursesWithoutBRTable;
