import { apiFetch } from "./http";
import { API_BASE_URL } from "./server.js";
import { waitForOperation } from "./operations";

// Fetch all courses
export const fetchCourses = async (signal) => {
    try {
        const response = await apiFetch(`${API_BASE_URL}api/admin/dbcourses`, {
            signal,
            credentials: "include",
        });
        const data = await response.json();
        if (!Array.isArray(data))
            throw new Error("The course list could not be read. Please try again.");
        return data;
    } catch (error) {
        console.error("Error fetching courses:", error);
        throw error;
    }
};

// Update course name
export const updateCourseName = async (code, newName, newCode) => {
    try {
        const safeCode = code.toLowerCase().trim();
        const response = await apiFetch(`${API_BASE_URL}api/admin/course/${safeCode}`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ name: newName, newCode }),
            credentials: "include",
        });
        const completed = await waitForOperation(await response.json());
        return completed.course || completed;
    } catch (error) {
        console.error("Error updating course name:", error);
        throw error;
    }
};

// Create a new course
export const createCourse = async (code, name) => {
    try {
        const response = await apiFetch(`${API_BASE_URL}api/course/create/${code}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ name }),
            credentials: "include",
        });
        return await response.json();
    } catch (error) {
        console.error("Error creating course:", error);
        throw error;
    }
};

// Bulk sync courses from CSV data
export const bulkSyncCourses = async (courses, analysis, onProgress = null) => {
    const results = {
        created: [],
        updated: [],
        skipped: [],
        errors: [],
    };

    // Only process courses that need changes
    const coursesToProcess = [];

    // Add missing courses (need to be created)
    if (analysis.missingCourses && analysis.missingCourses.length > 0) {
        coursesToProcess.push(...analysis.missingCourses);
    }

    // Add courses with name mismatches (need to be updated)
    if (analysis.nameConflicts && analysis.nameConflicts.length > 0) {
        coursesToProcess.push(
            ...analysis.nameConflicts.map((conflict) => ({
                code: conflict.code,
                name: conflict.csvName,
            })),
        );
    }

    const total = coursesToProcess.length;
    let processed = 0;

    if (total === 0) {
        // No courses need processing
        if (onProgress) {
            onProgress(0, 0);
        }
        return results;
    }

    for (const course of coursesToProcess) {
        try {
            // Check if this is a missing course (needs creation) or existing course (needs update)
            const isMissingCourse =
                analysis.missingCourses &&
                analysis.missingCourses.some((c) => c.code === course.code);

            if (isMissingCourse) {
                // Create new course
                const createResponse = await createCourse(course.code, course.name);
                if (createResponse.message === "Course created successfully") {
                    results.created.push(course);
                } else {
                    results.errors.push({ course, error: "Failed to create course" });
                }
            } else {
                // Update existing course name
                const updateResponse = await updateCourseName(course.code, course.name);
                if (updateResponse && updateResponse.code) {
                    results.updated.push(course);
                } else {
                    results.errors.push({ course, error: "Failed to update course name" });
                }
            }
        } catch (error) {
            results.errors.push({ course, error: error.message });
        }

        processed++;
        if (onProgress) {
            onProgress(processed, total);
        }
    }

    return results;
};

// Delete a course
export const deleteCourse = async (code) => {
    try {
        const safeCode = code.toLowerCase().trim();
        const response = await apiFetch(`${API_BASE_URL}api/admin/course/${safeCode}/delete`, {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json",
            },
            credentials: "include",
        });

        return await waitForOperation(await response.json());
    } catch (error) {
        console.error("Error deleting course:", error);
        throw error;
    }
};

export const fetchCourseDashboardData = async (code, signal) => {
    try {
        const safeCode = code.toLowerCase().trim();
        const response = await apiFetch(`${API_BASE_URL}api/admin/course/${safeCode}/dashboard`, {
            signal,
            credentials: "include",
        });
        return await response.json();
    } catch (error) {
        console.error("Error fetching dashboard:", error);
        throw error;
    }
};

export const handleContribution = async (contributionId, action, courseCode, affectedCourses) => {
    try {
        const response = await apiFetch(`${API_BASE_URL}api/admin/contribution/action`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ contributionId, action, courseCode, affectedCourses }),
            credentials: "include",
        });
        return await waitForOperation(await response.json());
    } catch (error) {
        console.error("Error handling contribution:", error);
        throw error;
    }
};

export const deleteNode = async (type, id, courseCode, affectedCourses) => {
    try {
        const response = await apiFetch(`${API_BASE_URL}api/admin/node/${type}/${id}`, {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ courseCode, affectedCourses }),
            credentials: "include",
        });
        return await waitForOperation(await response.json());
    } catch (error) {
        console.error("Error deleting node:", error);
        throw error;
    }
};
