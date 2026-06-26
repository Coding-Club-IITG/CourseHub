import React, { useState, useEffect, useCallback } from "react";
import {
    fetchStudents,
    searchStudents,
    refreshStudentCourses,
    deleteStudent,
    semesterReset,
} from "@/apis/student";
import AddBRs from "../components/AddBRs";
import { FaRedo, FaSearch, FaSync, FaTrash, FaChevronDown, FaChevronUp, FaPlus, FaUserGraduate, FaUsers } from "react-icons/fa";
const ConfirmDialog = ({ message, onConfirm, onCancel, loading }) => (
    <div
        className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50"
        onClick={onCancel}
    >
        <div
            className="bg-white rounded-2xl shadow-2xl border border-gray-200/60 p-6 w-80"
            onClick={(e) => e.stopPropagation()}
        >
            <h3 className="text-base font-semibold text-gray-900 mb-2">Are you sure?</h3>
            <p className="text-sm text-gray-500 mb-5">{message}</p>
            <div className="flex gap-2 justify-end">
                <button
                    onClick={onCancel}
                    disabled={loading}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-all disabled:opacity-50"
                >
                    Cancel
                </button>
                <button
                    onClick={onConfirm}
                    disabled={loading}
                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-all disabled:opacity-50 flex items-center gap-2"
                >
                    {loading && (
                        <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent" />
                    )}
                    {loading ? "Processing..." : "Confirm"}
                </button>
            </div>
        </div>
    </div>
);

export default function Students() {
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searching, setSearching] = useState(false);
    const [error, setError] = useState(null);

   const [searchQuery, setSearchQuery] = useState("");
    const [expandedId, setExpandedId] = useState(null);
    const [showBROnly, setShowBROnly] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);

    const [rowLoadingId, setRowLoadingId] = useState(null);
    const [rowConfirm, setRowConfirm] = useState(null);

    const [showResetConfirm, setShowResetConfirm] = useState(false);
    const [resetLoading, setResetLoading] = useState(false);
    const [resetSuccess, setResetSuccess] = useState(null);
    const [resetError, setResetError] = useState(null);

const loadStudents = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await fetchStudents(showBROnly);
            setStudents(response.students || []);
        } catch (err) {
            setError(err.message || "An error occurred while fetching students.");
        } finally {
            setLoading(false);
        }
    }, [showBROnly]);

    useEffect(() => {
        loadStudents();
    }, [loadStudents]);

    useEffect(() => {
        if (!searchQuery.trim()) {
            loadStudents();
            return;
        }

        setSearching(true);
        const timer = setTimeout(async () => {
            try {
                setError(null);
                const response = await searchStudents(searchQuery.trim(), showBROnly);
                setStudents(response.students || []);
            } catch (err) {
                setError(err.message || "Search failed.");
            } finally {
                setSearching(false);
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [searchQuery, showBROnly, loadStudents]);

    const handleToggleExpand = (id) => {
        setExpandedId((prev) => (prev === id ? null : id));
    };

    const handleRowRefresh = async (id) => {
        setRowLoadingId(id);
        try {
            await refreshStudentCourses(id);
            loadStudents();
        } catch (err) {
            setError(err.message || "Failed to refresh courses.");
        } finally {
            setRowLoadingId(null);
            setRowConfirm(null);
        }
    };

    const handleRowDelete = async (id) => {
        setRowLoadingId(id);
        try {
            await deleteStudent(id);
            loadStudents();
        } catch (err) {
            setError(err.message || "Failed to delete student.");
        } finally {
            setRowLoadingId(null);
            setRowConfirm(null);
        }
    };

    const handleSemesterReset = async () => {
        setResetLoading(true);
        setResetError(null);
        setResetSuccess(null);
        try {
            const result = await semesterReset();
            setResetSuccess(result.message || "Semester reset complete.");
            setShowResetConfirm(false);
            loadStudents();
        } catch (err) {
            setResetError(err.message || "Semester reset failed.");
            setShowResetConfirm(false);
        } finally {
            setResetLoading(false);
        }
    };

    const isLoading = loading || searching;

    return (
        <div className="p-6 space-y-6">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/60 p-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Students</h1>
                        <p className="text-gray-500 mt-1 text-sm">
                            View and manage all registered students
                        </p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                        {showBROnly && (
                            <button
                                onClick={() => setShowAddModal(true)}
                                className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white text-sm font-medium rounded-xl shadow-md hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-300 transition-all"
                            >
                                <FaPlus className="h-3.5 w-3.5" />
                                Add BRs
                            </button>
                        )}
                        <button
                            onClick={() => setShowResetConfirm(true)}
                            className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-red-600 bg-red-50 border border-red-200 hover:bg-red-100 rounded-xl transition-all"
                        >
                            <FaRedo className="h-3.5 w-3.5" />
                            Semester Reset
                        </button>
                    </div>
                </div>

                <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="relative">
                        <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by name or roll number..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full sm:w-72 pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all placeholder:text-gray-400"
                        />
                        {searching && (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin rounded-full h-3.5 w-3.5 border-2 border-blue-500 border-t-transparent" />
                        )}
                    </div>

                    <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
                        <button
                            onClick={() => setShowBROnly(false)}
                            className={`flex items-center gap-1.5 py-1.5 px-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                                !showBROnly
                                    ? "bg-white text-blue-700 shadow-sm border border-gray-200/80"
                                    : "text-gray-500 hover:text-gray-700"
                            }`}
                        >
                            <FaUserGraduate className="h-3.5 w-3.5" />
                            All Students
                        </button>
                        <button
                            onClick={() => setShowBROnly(true)}
                            className={`flex items-center gap-1.5 py-1.5 px-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                                showBROnly
                                    ? "bg-white text-blue-700 shadow-sm border border-gray-200/80"
                                    : "text-gray-500 hover:text-gray-700"
                            }`}
                        >
                            <FaUsers className="h-3.5 w-3.5" />
                            BRs Only
                        </button>
                    </div>
                </div>
            </div>
            {resetSuccess && (
                <div className="flex items-center justify-between p-4 rounded-xl border bg-green-50 border-green-200 text-green-700 text-sm">
                    {resetSuccess}
                    <button onClick={() => setResetSuccess(null)} className="text-green-500 hover:text-green-700 ml-4">
                        ✕
                    </button>
                </div>
            )}
            {resetError && (
                <div className="flex items-center justify-between p-4 rounded-xl border bg-red-50 border-red-200 text-red-700 text-sm">
                    {resetError}
                    <button onClick={() => setResetError(null)} className="text-red-400 hover:text-red-600 ml-4">
                        ✕
                    </button>
                </div>
            )}

            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/60 p-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-base font-semibold text-gray-800">
                        {showBROnly ? "Branch Representatives" : "Student Table"}
                    </h2>
                    {!isLoading && (
                        <span className="text-xs text-gray-400">
                            {students.length} result{students.length !== 1 ? "s" : ""}
                        </span>
                    )}
                </div>

                {isLoading && (
                    <div className="flex items-center justify-center py-16 text-gray-400 text-sm gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent" />
                        {searching ? "Searching..." : "Loading..."}
                    </div>
                )}

                {!isLoading && error && (
                    <p className="text-sm text-red-600 bg-red-50 border border-red-100 px-4 py-3 rounded-lg">
                        {error}
                    </p>
                )}

                {!isLoading && !error && students.length === 0 && (
                    <div className="text-center py-16 text-gray-400 text-sm">
                        {showBROnly ? "No branch representatives found." : "No students found."}
                    </div>
                )}

                {!isLoading && !error && students.length > 0 && (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-100">
                            <thead>
                                <tr className="bg-gray-50/80">
                                    <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                        Roll Number
                                    </th>
                                    <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                        Name
                                    </th>
                                    <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                        Email
                                    </th>
                                    <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                        Degree
                                    </th>
                                    <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                        Semester
                                    </th>
                                    <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                        Actions
                                    </th>
                                    <th className="py-3 px-4 w-8"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {students.map((student) => {
                                    const isExpanded = expandedId === student._id;
                                    const isRowLoading = rowLoadingId === student._id;

                                    return (
                                        <React.Fragment key={student._id}>
                                            <tr
                                                className={`transition-colors ${
                                                    isExpanded ? "bg-blue-50/40" : "hover:bg-gray-50/60"
                                                }`}
                                            >
                                                <td className="py-3.5 px-4 text-sm font-medium text-gray-900">
                                                    {student.rollNumber}
                                                </td>
                                                <td className="py-3.5 px-4 text-sm text-gray-700">{student.name}</td>
                                                <td className="py-3.5 px-4 text-sm text-gray-500">{student.email}</td>
                                                <td className="py-3.5 px-4 text-sm text-gray-500">{student.degree}</td>
                                                <td className="py-3.5 px-4 text-sm text-gray-500">{student.semester}</td>
                                                <td className="py-3.5 px-4">
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={() =>
                                                                setRowConfirm({
                                                                    type: "refresh",
                                                                    id: student._id,
                                                                    label: student.name,
                                                                })
                                                            }
                                                            disabled={isRowLoading}
                                                            title="Refresh courses"
                                                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                                                        >
                                                            {isRowLoading && rowConfirm?.type === "refresh" ? (
                                                                <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-blue-600 border-t-transparent" />
                                                            ) : (
                                                                <FaSync className="h-3.5 w-3.5" />
                                                            )}
                                                        </button>
                                                        <button
                                                            onClick={() =>
                                                                setRowConfirm({
                                                                    type: "delete",
                                                                    id: student._id,
                                                                    label: student.name,
                                                                })
                                                            }
                                                            disabled={isRowLoading}
                                                            title="Delete student"
                                                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                                                        >
                                                            {isRowLoading && rowConfirm?.type === "delete" ? (
                                                                <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-red-500 border-t-transparent" />
                                                            ) : (
                                                                <FaTrash className="h-3.5 w-3.5" />
                                                            )}
                                                        </button>
                                                    </div>
                                                </td>
                                                <td className="py-3.5 px-4">
                                                    <button
                                                        onClick={() => handleToggleExpand(student._id)}
                                                        className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
                                                    >
                                                        {isExpanded ? (
                                                            <FaChevronUp className="h-3 w-3" />
                                                        ) : (
                                                            <FaChevronDown className="h-3 w-3" />
                                                        )}
                                                    </button>
                                                </td>
                                            </tr>

                                            {expandedId === student._id && (
                                                <tr className="bg-blue-50/30">
                                                    <td colSpan={7} className="px-6 py-4">
                                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm mb-3">
                                                            <div>
                                                                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">
                                                                    Department
                                                                </p>
                                                                <p className="text-gray-700">{student.department}</p>
                                                            </div>
                                                            <div>
                                                                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">
                                                                    BR Status
                                                                </p>
                                                                <span
                                                                    className={`inline-block text-xs px-2 py-0.5 rounded-md font-medium ${
                                                                        student.isBR
                                                                            ? "bg-green-100 text-green-700 border border-green-200"
                                                                            : "bg-gray-100 text-gray-500 border border-gray-200"
                                                                    }`}
                                                                >
                                                                    {student.isBR ? "Branch Rep" : "Regular Student"}
                                                                </span>
                                                            </div>
                                                            <div>
                                                                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">
                                                                    Courses Enrolled
                                                                </p>
                                                                <p className="text-gray-700">
                                                                    {student.courses?.length || 0}
                                                                </p>
                                                            </div>
                                                            <div>
                                                                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">
                                                                    Student ID
                                                                </p>
                                                                <p className="text-gray-700 font-mono text-xs">
                                                                    {student._id}
                                                                </p>
                                                            </div>
                                                        </div>

                                                        {student.courses?.length > 0 && (
                                                            <div>
                                                                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
                                                                    Current Courses
                                                                </p>
                                                                <div className="flex flex-wrap gap-1.5">
                                                                    {student.courses.map((course, idx) => (
                                                                        <span
                                                                            key={idx}
                                                                            className="text-xs bg-white border border-gray-200 px-2 py-1 rounded-md text-gray-600"
                                                                        >
                                                                            {course.code}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {rowConfirm && (
                <ConfirmDialog
                    message={
                        rowConfirm.type === "delete"
                            ? `Delete ${rowConfirm.label}? This will permanently remove their student record and cannot be undone.`
                            : `Refresh courses for ${rowConfirm.label}?`
                    }
                    loading={rowLoadingId === rowConfirm.id}
                    onConfirm={() =>
                        rowConfirm.type === "delete"
                            ? handleRowDelete(rowConfirm.id)
                            : handleRowRefresh(rowConfirm.id)
                    }
                    onCancel={() => setRowConfirm(null)}
                />
            )}
{showResetConfirm && (
                <ConfirmDialog
                    message="This will clear the course list for every student in the database. This action cannot be undone."
                    loading={resetLoading}
                    onConfirm={handleSemesterReset}
                    onCancel={() => setShowResetConfirm(false)}
                />
            )}

            {showAddModal && (
                <AddBRs
                    onSuccess={loadStudents}
                    onClose={() => setShowAddModal(false)}
                />
            )}
        </div>
    );
}