import { API_BASE_URL } from "./server.js";

// Fetch all students, sorted by rollNumber descending (server-side)
// Pass brOnly=true to fetch only Branch Representatives
export const fetchStudents = async (brOnly = false) => {
    try {
        const url = `${API_BASE_URL}api/student/all${brOnly ? "?isBR=true" : ""}`;
        const response = await fetch(url, { credentials: "include" });
        return await response.json();
    } catch (error) {
        console.error("Error fetching students:", error);
        throw error;
    }
};

// Search students by name or roll number
// Pass brOnly=true to restrict search results to Branch Representatives
export const searchStudents = async (query, brOnly = false) => {
    try {
        const params = new URLSearchParams({ q: query });
        if (brOnly) params.set("isBR", "true");

        const response = await fetch(
            `${API_BASE_URL}api/student/search?${params.toString()}`,
            { credentials: "include" }
        );
        return await response.json();
    } catch (error) {
        console.error("Error searching students:", error);
        throw error;
    }
};

export const refreshStudentCourses = async (id) => {
    try {
        const response = await fetch(`${API_BASE_URL}api/student/refresh/${id}`, {
            method: "PUT",
            credentials: "include",
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || result.message || "Failed to refresh courses");
        return result;
    } catch (error) {
        console.error("Error refreshing student courses:", error);
        throw error;
    }
};

export const deleteStudent = async (id) => {
    try {
        const response = await fetch(`${API_BASE_URL}api/student/${id}`, {
            method: "DELETE",
            credentials: "include",
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || result.message || "Failed to delete student");
        return result;
    } catch (error) {
        console.error("Error deleting student:", error);
        throw error;
    }
};

export const semesterReset = async () => {
    try {
        const response = await fetch(`${API_BASE_URL}api/student/semester-reset`, {
            method: "POST",
            credentials: "include",
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || result.message || "Semester reset failed");
        return result;
    } catch (error) {
        console.error("Error during semester reset:", error);
        throw error;
    }
};