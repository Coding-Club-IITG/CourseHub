import React from "react";

const BrTable = ({ brs , onDelete }) => {
    return (
        <div className="p-6 bg-white rounded-lg shadow-md">
            <div className="flex items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">BR Table</h2>
            </div>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700">
                                Name
                            </th>
                            <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700">
                                Email
                            </th>
                            <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700">
                                Degree
                            </th>
                            <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700">
                                Department
                            </th>
                            <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700">
                                Semester
                            </th>
                            <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {brs.map((person) => (
                            <tr key={person.email} className="hover:bg-gray-50 transition">
                                <td className="py-4 px-4 text-sm font-medium text-gray-900">
                                    {person.name}
                                </td>
                                <td className="py-4 px-4 text-sm text-gray-600">{person.email}</td>
                                <td className="py-4 px-4 text-sm text-gray-600">{person.degree}</td>
                                <td className="py-4 px-4 text-sm text-gray-600">
                                    {person.department}
                                </td>
                                <td className="py-4 px-4 text-sm text-gray-600">
                                    {person.semester}
                                </td>
                                <td className="py-4 px-4 text-sm text-gray-600">
                                    <button onClick={() => onDelete(person.email)}
                                        className="text-red-500 hover:text-red-900 font-medium transition" >
                                        Remove
                                    </button>
                                </td>

                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default BrTable;
