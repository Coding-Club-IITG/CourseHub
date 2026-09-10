import { apiFetch } from "./http";
import { waitForOperation } from "./operations";
import { API_BASE_URL } from "./server.js";

export async function fetchStudents(
    { q = "", isBR = false, page = 1, pageSize = 20 } = {},
    signal,
) {
    const params = new URLSearchParams({
        q,
        isBR: String(isBR),
        page: String(page),
        pageSize: String(pageSize),
    });
    const response = await apiFetch(API_BASE_URL + "api/student/all?" + params, { signal });
    const data = await response.json();
    if (
        !Array.isArray(data.items) ||
        !Number.isSafeInteger(data.total) ||
        !Number.isSafeInteger(data.page) ||
        !Number.isSafeInteger(data.pageSize)
    )
        throw new Error("The student list could not be read. Please try again.");
    return data;
}
export async function fetchStudentDetails(id, signal) {
    const response = await apiFetch(API_BASE_URL + "api/student/" + encodeURIComponent(id), {
        signal,
    });
    const data = await response.json();
    if (!data.item?._id) throw new Error("Student details could not be read. Please try again.");
    return data;
}

// Refresh from upstream and wait for persistence
export const refreshStudentCourses = async (id) => {
    try {
        const response = await apiFetch(`${API_BASE_URL}api/student/refresh/${id}`, {
            method: "PUT",
            credentials: "include",
        });
        const result = await response.json();
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
    const operation = await waitForOperation(await response.json());
    return operation.synchronization || operation;
};
