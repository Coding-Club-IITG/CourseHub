import { apiFetch, responseError } from "./http";
import { waitForOperation } from "./operations";
import { API_BASE_URL } from "./server.js";

// Fetch all students sorted by rollNumber descending.
// Pass brOnly=true to fetch only Branch Representatives.
export const fetchStudents = async (brOnly = false) => {
    try {
        const url = brOnly ? `${API_BASE_URL}api/br/allBRs` : `${API_BASE_URL}api/student/all`;
        const response = await apiFetch(url, { credentials: "include" });
        const data = await response.json();
        return { students: data.students || data.brs || [] };
    } catch (error) {
        console.error("Error fetching students :", error);
        throw error;
    }
};

// Search students by name or roll number.
// Pass brOnly=true to restrict results to Branch Representatives.
export const searchStudents = async (query, brOnly = false) => {
    try {
        const params = new URLSearchParams({ q: query });
        if (brOnly) params.set("isBR", "true");
        const response = await apiFetch(`${API_BASE_URL}api/student/search?${params.toString()}`, {
            credentials: "include",
        });
        return await response.json();
    } catch (error) {
        console.error("Error searching students:", error);
        throw error;
    }
};

// Refresh from upstream and wait for persistence
export const refreshStudentCourses = async (id) => {
    try {
        const response = await apiFetch(`${API_BASE_URL}api/student/refresh/${id}`, {
            method: "PUT",
            credentials: "include",
        });
        const result = await response.json();
        if (!response.ok)
            throw new Error(result.error || result.message || "Failed to refresh courses");
        const operation = await waitForOperation(result);
        return operation.synchronization || operation;
    } catch (error) {
        console.error("Error refreshing student courses:", error);
        throw error;
    }
};

// Delete a single student permanently.
export const deleteStudent = async (id) => {
    try {
        const response = await apiFetch(`${API_BASE_URL}api/student/${id}`, {
            method: "DELETE",
            credentials: "include",
        });
        const result = await response.json();
        if (!response.ok)
            throw new Error(result.error || result.message || "Failed to delete student");
        return result;
    } catch (error) {
        console.error("Error deleting student:", error);
        throw error;
    }
};

export const refreshAllStudentCourses = async () => {
    const response = await apiFetch(`${API_BASE_URL}api/admin/sync-courses-cache`, {
        method: "POST",
    });
    if (!response.ok) throw await responseError(response, "Course refresh failed");
    const operation = await waitForOperation(await response.json());
    return operation.synchronization || operation;
};
