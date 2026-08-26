import React, { useState, useEffect } from "react";
import {
    FaPen,
    FaSearch,
    FaBook,
    FaPlus,
    FaEdit,
    FaUpload,
    FaTimes,
    FaExclamationTriangle,
    FaInfoCircle,
    FaCopy,
    FaCheck,
    FaTrash,
} from "react-icons/fa";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Modal, ModalHeader, ModalBody, ModalFooter } from "@/components/ui/modal";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { fetchCourses, updateCourseName, bulkSyncCourses, deleteCourse } from "@/apis/courses";
import { useNavigate } from "react-router-dom";
import { FaEye } from "react-icons/fa"; // Add FaEye to your react-icons import

function Courses() {
    const navigate = useNavigate();
    const [courses, setCourses] = useState([]);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [hoveredRow, setHoveredRow] = useState(null);
    const [showOnlyNameless, setShowOnlyNameless] = useState(false);
    const [showOnlyDuplicates, setShowOnlyDuplicates] = useState(false);
    const [editingCode, setEditingCode] = useState(null);
    const [editedCode, setEditedCode] = useState("");
    const [editedName, setEditedName] = useState("");

    // Delete states
    const [courseToDelete, setCourseToDelete] = useState(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleting, setDeleting] = useState(false);

    // CSV Upload states
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [csvData, setCsvData] = useState([]);
    const [uploadErrors, setUploadErrors] = useState([]);
    const [uploadStats, setUploadStats] = useState(null);
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [syncResults, setSyncResults] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [syncProgress, setSyncProgress] = useState({ current: 0, total: 0 });

    const itemsPerPage = 10;

    useEffect(() => {
        const loadCourses = async () => {
            try {
                const data = await fetchCourses();
                setCourses(data);
                setLoading(false);
            } catch (error) {
                console.error("Error loading courses:", error);
                setCourses([]);
                setLoading(false);
            }
        };
        loadCourses();
    }, []);

    const handleRename = async (oldCode, newName, newCode) => {
        try {
            const updated = await updateCourseName(oldCode, newName, newCode);
            if (updated && updated.code) {
                setCourses((courses) =>
                    courses.map((c) =>
                        c.code === oldCode ? { ...c, code: updated.code, name: updated.name } : c
                    )
                );
            }
        } catch (error) {
            if (error.status === 400) {
                alert(error.message || "Invalid input");
            }
        }
    };

    const startEdit = (code, currentName) => {
        setEditingCode(code);
        setEditedCode(code);
        setEditedName(currentName || "");
    };

    const cancelEdit = () => {
        setEditingCode(null);
        setEditedCode("");
        setEditedName("");
    };

    const saveEdit = () => {
        if (!editingCode) return;
        const newCode = editedCode.trim().toUpperCase();
        const newName = editedName.trim();
        if (!newCode || !newName) return;
        handleRename(editingCode, newName, newCode);
        setEditingCode(null);
        setEditedCode("");
        setEditedName("");
    };

    const handleDeleteClick = (course) => {
        setCourseToDelete(course);
        setShowDeleteConfirm(true);
    };

    const handleDeleteConfirm = async () => {
        if (!courseToDelete) return;

        setDeleting(true);
        try {
            const result = await deleteCourse(courseToDelete.code);

            // Remove the course from the local state
            setCourses((prevCourses) => prevCourses.filter((c) => c.code !== courseToDelete.code));

            // Show success message with affected users count
            const successMessage = `Course "${courseToDelete.code}" deleted successfully.`;
            const affectedUsersMessage =
                result.affectedUsers > 0
                    ? ` ${result.affectedUsers} user(s) were updated.`
                    : " No users were affected.";

            alert(successMessage + affectedUsersMessage);
        } catch (error) {
            // Show detailed error message
            const errorMessage =
                error.response?.data?.message || error.message || "Unknown error occurred";
            alert(`Failed to delete course: ${errorMessage}`);
            console.error("Delete course error:", error);
        } finally {
            setDeleting(false);
            setShowDeleteConfirm(false);
            setCourseToDelete(null);
        }
    };

    const handleDeleteCancel = () => {
        setShowDeleteConfirm(false);
        setCourseToDelete(null);
    };

    const handlePageChange = (page) => {
        setCurrentPage(page);
    };

    // Function to detect duplicate courses
    const getDuplicateCourses = () => {
        const codeCount = {};
        const duplicates = [];

        courses.forEach((course) => {
            const normalizedCode = course.code.replace(/\s+/g, "").toUpperCase();
            if (codeCount[normalizedCode]) {
                codeCount[normalizedCode].push(course);
            } else {
                codeCount[normalizedCode] = [course];
            }
        });

        Object.values(codeCount).forEach((coursesWithSameCode) => {
            if (coursesWithSameCode.length > 1) {
                duplicates.push(...coursesWithSameCode);
            }
        });

        return duplicates;
    };

    // CSV Upload Functions
    const handleFileUpload = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target.result;
            const lines = text.split("\n").filter((line) => line.trim());

            if (lines.length < 2) {
                setUploadErrors(["CSV file must have at least a header row and one data row"]);
                return;
            }

            const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
            if (!headers.includes("code") || !headers.includes("name")) {
                setUploadErrors(['CSV file must have "code" and "name" columns']);
                return;
            }

            const codeIndex = headers.indexOf("code");
            const nameIndex = headers.indexOf("name");
            const errors = [];
            const data = [];

            for (let i = 1; i < lines.length; i++) {
                const row = lines[i].split(",").map((cell) => cell.trim());
                const code = row[codeIndex];
                const name = row[nameIndex];

                if (!code || !name) {
                    errors.push(
                        `Row ${i + 1}: Missing ${
                            !code ? "code" : "name"
                        } - Code: "${code}", Name: "${name}"`
                    );
                } else {
                    data.push({
                        code: code.replace(/\s+/g, "").toUpperCase(),
                        name: name.trim(),
                    });
                }
            }

            if (errors.length > 0) {
                setUploadErrors(errors);
                setCsvData([]);
            } else {
                setUploadErrors([]);
                setCsvData(data);
                analyzeUpload(data);
            }
        };
        reader.readAsText(file);
    };

    const analyzeUpload = (uploadedCourses) => {
        const existingCodes = new Set(courses.map((c) => c.code.replace(/\s+/g, "").toUpperCase()));
        const missingCourses = uploadedCourses.filter((course) => !existingCodes.has(course.code));
        const existingCourses = uploadedCourses.filter((course) => existingCodes.has(course.code));

        // Check for name mismatches
        const nameMismatchCourses = existingCourses.filter((uploadedCourse) => {
            const existingCourse = courses.find(
                (c) => c.code.replace(/\s+/g, "").toUpperCase() === uploadedCourse.code
            );
            return existingCourse && existingCourse.name !== uploadedCourse.name;
        });

        setUploadStats({
            totalUploaded: uploadedCourses.length,
            existingCourses: existingCourses.length,
            missingCourses: missingCourses.length,
            nameMismatchCourses: nameMismatchCourses.length,
            missingCoursesData: missingCourses,
            nameMismatchData: nameMismatchCourses,
        });
        setShowConfirmDialog(true);
    };

    const handleConfirmSync = async () => {
        setUploading(true);

        // Calculate the actual number of courses that need processing
        const coursesToProcess =
            (uploadStats.missingCoursesData?.length || 0) +
            (uploadStats.nameMismatchData?.length || 0);
        setSyncProgress({ current: 0, total: coursesToProcess });

        try {
            const analysis = {
                missingCourses: uploadStats.missingCoursesData || [],
                nameConflicts:
                    uploadStats.nameMismatchData?.map((course) => ({
                        code: course.code,
                        csvName: course.name,
                        dbName: courses.find(
                            (c) => c.code.replace(/\s+/g, "").toUpperCase() === course.code
                        )?.name,
                    })) || [],
            };

            const results = await bulkSyncCourses(csvData, analysis, (current, total) => {
                setSyncProgress({ current, total });
            });
            setSyncResults(results);

            // Refresh courses list
            const data = await fetchCourses();
            setCourses(data);

            setShowConfirmDialog(false);
            setShowUploadModal(false);
        } catch (error) {
            console.error("Error syncing courses:", error);
        } finally {
            setUploading(false);
            setSyncProgress({ current: 0, total: 0 });
        }
    };

    const resetUpload = () => {
        setCsvData([]);
        setUploadErrors([]);
        setUploadStats(null);
        setShowConfirmDialog(false);
        setSyncResults(null);
        setSyncProgress({ current: 0, total: 0 });
    };

    const filteredCourses = courses.filter((course) => {
        const matchesSearch = course.code?.toLowerCase().includes(search.toLowerCase());
        const matchesNamelessFilter = showOnlyNameless ? course.name == "Name Unavailable" : true;

        let matchesDuplicateFilter = true;
        if (showOnlyDuplicates) {
            const duplicates = getDuplicateCourses();
            matchesDuplicateFilter = duplicates.some((dup) => dup._id === course._id);
        }

        return matchesSearch && matchesNamelessFilter && matchesDuplicateFilter;
    });

    const totalPages = Math.max(1, Math.ceil(filteredCourses.length / itemsPerPage));
    const paginatedCourses = filteredCourses.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    // Ensure current page stays within range when filtering
    useEffect(() => {
        if (currentPage > totalPages && totalPages > 0) {
            setCurrentPage(1);
        }
    }, [totalPages, currentPage]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
            <div className="p-6 space-y-6">
                {/* Header Section */}
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 p-6 transition-all duration-300 hover:shadow-xl">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center space-x-4">
                            <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg">
                                <FaBook className="h-7 w-7 text-white" />
                            </div>
                            <div>
                                <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                                    Courses
                                </h1>
                                <p className="text-gray-600 mt-2 text-lg">
                                    Manage and view all courses in the system
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center space-x-4">
                            <div className="text-right space-y-1">
                                <Badge
                                    variant="secondary"
                                    className="text-sm px-3 py-1 bg-blue-100 text-blue-800 border border-blue-200"
                                >
                                    {filteredCourses.length} courses
                                </Badge>
                                {(() => {
                                    const duplicates = getDuplicateCourses();
                                    return (
                                        duplicates.length > 0 && (
                                            <Badge
                                                variant="secondary"
                                                className="text-xs px-2 py-1 bg-red-100 text-red-800 border border-red-200 block"
                                            >
                                                {duplicates.length} duplicates
                                            </Badge>
                                        )
                                    );
                                })()}
                            </div>
                            <Button
                                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg transition-all duration-200 transform hover:scale-105"
                                onClick={() => setShowUploadModal(true)}
                            >
                                <FaPlus className="mr-2 h-4 w-4" />
                                Add Courses
                            </Button>
                        </div>
                    </div>

                    {/* Search Section */}
                    <div className="flex items-center gap-4">
                        <div className="relative max-w-md">
                            <FaSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                            <Input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search courses by code..."
                                className="pl-12 bg-white/80 border-gray-200 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200"
                            />
                        </div>
                        <Button
                            variant={showOnlyNameless ? "default" : "outline"}
                            onClick={() => setShowOnlyNameless(!showOnlyNameless)}
                            className={`transition-all duration-200 ${
                                showOnlyNameless
                                    ? "bg-gradient-to-r from-yellow-500 to-yellow-600 text-white border-0 shadow-md"
                                    : "bg-white/80 border-gray-200 hover:bg-yellow-50/80 hover:border-yellow-300"
                            }`}
                        >
                            {showOnlyNameless ? "Show All" : "Show Nameless Only"}
                        </Button>
                        <Button
                            variant={showOnlyDuplicates ? "default" : "outline"}
                            onClick={() => setShowOnlyDuplicates(!showOnlyDuplicates)}
                            className={`transition-all duration-200 ${
                                showOnlyDuplicates
                                    ? "bg-gradient-to-r from-red-500 to-red-600 text-white border-0 shadow-md"
                                    : "bg-white/80 border-gray-200 hover:bg-red-50/80 hover:border-red-300"
                            }`}
                        >
                            <FaCopy className="mr-2 h-4 w-4" />
                            {showOnlyDuplicates ? "Show All" : "Show Duplicates"}
                        </Button>
                    </div>
                </div>

                {/* Content Section */}
                {loading ? (
                    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 p-12">
                        <div className="flex items-center justify-center">
                            <div className="text-center space-y-6">
                                <div className="relative">
                                    <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mx-auto"></div>
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <FaBook className="h-8 w-8 text-blue-600" />
                                    </div>
                                </div>
                                <div>
                                    <p className="text-xl font-semibold text-gray-900">
                                        Loading courses...
                                    </p>
                                    <p className="text-gray-500 mt-2">
                                        Please wait while we fetch the data
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 overflow-hidden transition-all duration-300 hover:shadow-xl">
                        <div className="p-6 border-b border-gray-200/50 bg-gradient-to-r from-gray-50 to-gray-100/50">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-semibold text-gray-900">Course List</h2>
                                <div className="flex items-center space-x-4">
                                    <div className="text-sm text-gray-600 bg-white/60 px-3 py-1 rounded-full border border-gray-200">
                                        Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
                                        {Math.min(
                                            currentPage * itemsPerPage,
                                            filteredCourses.length
                                        )}{" "}
                                        of {filteredCourses.length} results
                                    </div>
                                    {totalPages > 1 && (
                                        <div className="flex items-center space-x-2">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() =>
                                                    handlePageChange(Math.max(1, currentPage - 1))
                                                }
                                                disabled={currentPage === 1}
                                                className="h-8 w-8 p-0 hover:bg-gray-100 transition-all duration-200"
                                                title="Previous page"
                                            >
                                                <span className="text-sm font-bold">‹</span>
                                            </Button>
                                            <div className="px-3 py-1 bg-blue-600 text-white rounded-md text-sm font-semibold min-w-[40px] text-center">
                                                {currentPage}
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() =>
                                                    handlePageChange(
                                                        Math.min(totalPages, currentPage + 1)
                                                    )
                                                }
                                                disabled={currentPage === totalPages}
                                                className="h-8 w-8 p-0 hover:bg-gray-100 transition-all duration-200"
                                                title="Next page"
                                            >
                                                <span className="text-sm font-bold">›</span>
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="overflow-hidden">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-gradient-to-r from-gray-50 to-gray-100/50 hover:from-gray-100 hover:to-gray-200/50 transition-all duration-200">
                                        <TableHead className="w-[200px] font-semibold text-gray-700 py-4 pl-6">
                                            Course Code
                                        </TableHead>
                                        <TableHead className="font-semibold text-gray-700 py-4 pl-6">
                                            Course Name
                                        </TableHead>
                                        <TableHead className="w-[120px] font-semibold text-gray-700 py-4 pl-6">
                                            Children
                                        </TableHead>
                                        <TableHead className="w-[120px] font-semibold text-gray-700 py-4 pl-6">
                                            Actions
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {paginatedCourses.map((course, index) => {
                                        const duplicates = getDuplicateCourses();
                                        const isDuplicate = duplicates.some(
                                            (dup) => dup._id === course._id
                                        );

                                        return (
                                            <TableRow
                                                key={course._id || course.code}
                                                className={`transition-all duration-200 ${
                                                    isDuplicate
                                                        ? "bg-red-50/80 border-l-4 border-red-400"
                                                        : hoveredRow === course.code
                                                        ? "bg-blue-50/80 shadow-sm"
                                                        : index % 2 === 0
                                                        ? "bg-white/60"
                                                        : "bg-gray-50/40"
                                                } hover:bg-blue-50/80 hover:shadow-sm`}
                                                onMouseEnter={() => setHoveredRow(course.code)}
                                                onMouseLeave={() => setHoveredRow(null)}
                                            >
                                                <TableCell className="font-mono font-semibold text-gray-900 py-4 pl-6">
                                                    <div className="flex items-center space-x-2">
                                                        {isDuplicate && (
                                                            <FaExclamationTriangle
                                                                className="h-4 w-4 text-red-500"
                                                                title="Duplicate course code"
                                                            />
                                                        )}
                                                        {editingCode === course.code ? (
                                                            <Input
                                                                value={editedCode}
                                                                onChange={(e) =>
                                                                    setEditedCode(e.target.value)
                                                                }
                                                                placeholder="Enter course code"
                                                                className="h-9 max-w-xs font-mono"
                                                                onKeyDown={(e) => {
                                                                    if (e.key === "Enter")
                                                                        saveEdit();
                                                                    if (e.key === "Escape")
                                                                        cancelEdit();
                                                                }}
                                                            />
                                                        ) : (
                                                            <span>{course.code}</span>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="py-4 pl-6">
                                                    {editingCode === course.code ? (
                                                        <Input
                                                            value={editedName}
                                                            onChange={(e) =>
                                                                setEditedName(e.target.value)
                                                            }
                                                            placeholder="Enter course name"
                                                            className="h-9 max-w-md"
                                                            onKeyDown={(e) => {
                                                                if (e.key === "Enter") saveEdit();
                                                                if (e.key === "Escape")
                                                                    cancelEdit();
                                                            }}
                                                        />
                                                    ) : (
                                                        <span className="text-gray-900 font-medium">
                                                            {course.name}
                                                        </span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="py-4 pl-6">
                                                    <div className="flex items-center space-x-2">
                                                        <Badge
                                                            variant="secondary"
                                                            className="text-xs px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 font-medium"
                                                        >
                                                            {course.children ? course.children.length : 0} {course.children?.length === 1 ? "folder" : "folders"}
                                                        </Badge>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="py-4 pl-6">
                                                    <div className="flex items-center space-x-2">
                                                        {editingCode === course.code ? null : (
                                                            <>
                                                            <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-8 w-8 p-0 hover:bg-blue-100/80 transition-all duration-200 transform hover:scale-110"
                                                            title="View Course Dashboard"
                                                            onClick={() => navigate(`/admin/courses/${course.code}`)}>
                                                            <FaEye className="h-4 w-4 text-blue-600" />
                                                            </Button>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="h-8 w-8 p-0 hover:bg-blue-100/80 transition-all duration-200 transform hover:scale-110"
                                                                    title="Edit course code and name"
                                                                    onClick={() =>
                                                                        startEdit(
                                                                            course.code,
                                                                            course.name
                                                                        )
                                                                    }
                                                                >
                                                                    <FaEdit className="h-4 w-4" />
                                                                </Button>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="h-8 w-8 p-0 hover:bg-red-100/80 transition-all duration-200 transform hover:scale-110"
                                                                    title="Delete course"
                                                                    onClick={() =>
                                                                        handleDeleteClick(course)
                                                                    }
                                                                >
                                                                    <FaTrash className="h-4 w-4 text-red-600" />
                                                                </Button>
                                                            </>
                                                        )}
                                                        {editingCode === course.code && (
                                                            <>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="h-8 w-8 p-0 hover:bg-green-100/80 transition-all duration-200 transform hover:scale-110"
                                                                    onClick={saveEdit}
                                                                    title="Save"
                                                                >
                                                                    <FaCheck className="h-4 w-4 text-green-700" />
                                                                </Button>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="h-8 w-8 p-0 hover:bg-red-100/80 transition-all duration-200 transform hover:scale-110"
                                                                    onClick={cancelEdit}
                                                                    title="Cancel"
                                                                >
                                                                    <FaTimes className="h-4 w-4 text-red-700" />
                                                                </Button>
                                                            </>
                                                        )}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                    {paginatedCourses.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={4} className="h-40 text-center">
                                                <div className="text-center space-y-4">
                                                    <div className="mx-auto w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center shadow-inner">
                                                        <FaBook className="h-8 w-8 text-gray-400" />
                                                    </div>
                                                    <div>
                                                        <p className="text-lg font-semibold text-gray-900">
                                                            {showOnlyDuplicates
                                                                ? "No duplicate courses found"
                                                                : "No courses found"}
                                                        </p>
                                                        <p className="text-gray-500 mt-2">
                                                            {showOnlyDuplicates
                                                                ? "No courses with duplicate codes were found"
                                                                : search
                                                                ? "Try adjusting your search terms"
                                                                : "No courses available"}
                                                        </p>
                                                    </div>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                )}
            </div>

            {/* CSV Upload Modal */}
            <Modal
                isOpen={showUploadModal}
                onClose={() => {
                    setShowUploadModal(false);
                    resetUpload();
                }}
            >
                <ModalHeader>
                    <div className="flex items-center space-x-2">
                        <FaUpload className="h-6 w-6 text-blue-600" />
                        <span>Upload Courses CSV</span>
                    </div>
                </ModalHeader>
                <ModalBody>
                    <div className="space-y-4">
                        <div>
                            <p className="text-sm text-gray-600 mb-2">
                                Upload a CSV file with "code" and "name" columns to bulk add
                                courses.
                            </p>
                            <input
                                type="file"
                                accept=".csv"
                                onChange={handleFileUpload}
                                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                            />
                        </div>

                        {uploadErrors.length > 0 && (
                            <Alert variant="destructive">
                                <FaExclamationTriangle className="h-4 w-4" />
                                <AlertTitle>Upload Errors</AlertTitle>
                                <AlertDescription>
                                    <ul className="list-disc list-inside mt-2 space-y-1">
                                        {uploadErrors.map((error, index) => (
                                            <li key={index} className="text-sm">
                                                {error}
                                            </li>
                                        ))}
                                    </ul>
                                </AlertDescription>
                            </Alert>
                        )}

                        {syncResults && (
                            <Alert variant="success">
                                <FaInfoCircle className="h-4 w-4" />
                                <AlertTitle>Sync Completed</AlertTitle>
                                <AlertDescription>
                                    <div className="mt-2 space-y-1">
                                        <p>• Created: {syncResults.created.length} courses</p>
                                        <p>• Updated: {syncResults.updated.length} courses</p>
                                        <p>• Skipped: {syncResults.skipped.length} courses</p>
                                        {syncResults.errors.length > 0 && (
                                            <p className="text-red-600">
                                                • Errors: {syncResults.errors.length} courses
                                            </p>
                                        )}
                                    </div>
                                </AlertDescription>
                            </Alert>
                        )}
                    </div>
                </ModalBody>
                <ModalFooter>
                    <Button
                        variant="outline"
                        onClick={() => {
                            setShowUploadModal(false);
                            resetUpload();
                        }}
                    >
                        Cancel
                    </Button>
                </ModalFooter>
            </Modal>

            {/* Confirm Sync Modal */}
            <Modal isOpen={showConfirmDialog} onClose={() => setShowConfirmDialog(false)}>
                <ModalHeader>
                    <div className="flex items-center space-x-2">
                        <FaInfoCircle className="h-6 w-6 text-blue-600" />
                        <span>Confirm Course Sync</span>
                    </div>
                </ModalHeader>
                <ModalBody>
                    {uploadStats && (
                        <div className="space-y-4">
                            <Alert variant="info">
                                <AlertTitle>Upload Analysis</AlertTitle>
                                <AlertDescription>
                                    <div className="mt-2 space-y-1">
                                        <p>• Total courses in CSV: {uploadStats.totalUploaded}</p>
                                        <p>
                                            • Courses already in DB: {uploadStats.existingCourses}
                                        </p>
                                        <p>
                                            • Missing courses to sync: {uploadStats.missingCourses}
                                        </p>
                                        <p>
                                            • Courses with name mismatches:{" "}
                                            {uploadStats.nameMismatchCourses}
                                        </p>
                                    </div>
                                </AlertDescription>
                            </Alert>

                            {uploadStats.nameMismatchCourses > 0 && (
                                <Alert variant="warning">
                                    <FaExclamationTriangle className="h-4 w-4" />
                                    <AlertTitle>Name Mismatches Found</AlertTitle>
                                    <AlertDescription>
                                        <p className="mb-2">
                                            The following courses exist but have different names:
                                        </p>
                                        <ul className="list-disc list-inside space-y-1 text-sm">
                                            {uploadStats.nameMismatchData.map((course, index) => (
                                                <li key={index}>
                                                    <strong>{course.code}</strong>: Will be renamed
                                                    to "{course.name}"
                                                </li>
                                            ))}
                                        </ul>
                                    </AlertDescription>
                                </Alert>
                            )}

                            <div className="text-sm text-gray-600">
                                <p className="font-semibold mb-2">
                                    Actions that will be performed:
                                </p>
                                <ul className="space-y-1">
                                    <li>• Courses with matching names will be skipped</li>
                                    <li>• Courses with different names will be renamed</li>
                                    <li>• New courses will be created</li>
                                </ul>
                            </div>
                        </div>
                    )}
                </ModalBody>
                <ModalFooter>
                    <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleConfirmSync}
                        disabled={uploading}
                        className="bg-blue-600 hover:bg-blue-700"
                    >
                        {uploading
                            ? `${syncProgress.current}/${syncProgress.total} synced`
                            : "Confirm Sync"}
                    </Button>
                </ModalFooter>
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal isOpen={showDeleteConfirm} onClose={handleDeleteCancel}>
                <ModalHeader>
                    <div className="flex items-center space-x-2">
                        <FaExclamationTriangle className="h-6 w-6 text-red-600" />
                        <span>Delete Course</span>
                    </div>
                </ModalHeader>
                <ModalBody>
                    <Alert variant="destructive">
                        <AlertDescription>
                            <div className="mt-2 space-y-2">
                                <p>
                                    You are about to delete the course:{" "}
                                    <strong>{courseToDelete?.code}</strong>
                                    {courseToDelete?.name && <span> - {courseToDelete.name}</span>}
                                </p>
                                <p className="text-sm">This will:</p>
                                <ul className="text-sm list-disc list-inside space-y-1 ml-4">
                                    <li>Remove the course from all users who have it</li>
                                    <li>Delete all course data from the database</li>
                                </ul>
                                <p className="font-semibold text-red-600">
                                    This action is permanent and cannot be undone.
                                </p>
                            </div>
                        </AlertDescription>
                    </Alert>
                </ModalBody>
                <ModalFooter>
                    <Button variant="outline" onClick={handleDeleteCancel} disabled={deleting}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleDeleteConfirm}
                        disabled={deleting}
                        className="bg-red-600 hover:bg-red-700 text-white"
                    >
                        {deleting ? "Deleting..." : "Delete Course"}
                    </Button>
                </ModalFooter>
            </Modal>
        </div>
    );
}

export default Courses;
