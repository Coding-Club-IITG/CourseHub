import { apiFetch } from "./http";
import { API_BASE_URL } from "./server.js";

// Fetch all courses that don't have a branch representative
export const fetchCoursesWithoutBR = async (signal) => {
    try {
        const response = await apiFetch(`${API_BASE_URL}api/br/coursesWithoutBR`, {
            signal,
            credentials: "include",
        });
        return await response.json();
    } catch (error) {
        console.error("Error fetching courses without BR:", error);
        throw error;
    }
};

// Create a single BR
export const createBR = async (email) => {
    try {
        const response = await apiFetch(`${API_BASE_URL}api/br/create`, {
            method: "POST",
            credentials: "include",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ email }),
        });

        const result = await response.json();

        return result;
    } catch (error) {
        console.error("Error creating single BR:", error);
        throw error;
    }
};

// Delete BR
export const deleteBR = async (email) => {
    try {
        const response = await apiFetch(`${API_BASE_URL}api/br/delete`, {
            method: "DELETE",
            credentials: "include",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ email: email }),
        });
        const result = await response.json();
        return result;
    } catch (error) {
        console.error("Error deleting single BR:", error);
        throw error;
    }
};
