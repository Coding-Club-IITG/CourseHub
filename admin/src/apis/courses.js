import { apiFetch } from "./http";
import { API_BASE_URL } from "./server.js";
import { waitForOperation } from "./operations";

export async function fetchCourses(
    { q = "", nameless = false, duplicates = false, page = 1, pageSize = 20 } = {},
    signal,
) {
    const params = new URLSearchParams({
        q,
        nameless: String(nameless),
        duplicates: String(duplicates),
        page: String(page),
        pageSize: String(pageSize),
    });
    const response = await apiFetch(API_BASE_URL + "api/admin/dbcourses?" + params, { signal });
    const data = await response.json();
    if (
        !Array.isArray(data.items) ||
        ![data.page, data.pageSize, data.total].every(Number.isSafeInteger)
    )
        throw new Error("The course list could not be read. Please try again.");
    return data;
}
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
        return await response.json();
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
        return await response.json();
    } catch (error) {
        console.error("Error deleting node:", error);
        throw error;
    }
};
