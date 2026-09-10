import { apiFetch } from "./http";
import { API_BASE_URL } from "./server.js";

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
