import { API_BASE_URL } from "./server.js";

// Fetch mid-sem and end-sem dates (YYYY-MM-DD, IST) for 1st year and 2nd+ year.
export const fetchExamDates = async () => {
    try {
        const response = await fetch(`${API_BASE_URL}api/event/admin/examdates`, {
            credentials: "include",
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || result.error || "Failed to fetch exam dates");
        return result;
    } catch (error) {
        console.error("Error fetching exam dates:", error);
        throw error;
    }
};

// Create or update the exam dates.
export const saveExamDates = async (firstYearDates, otherDates) => {
    try {
        const response = await fetch(`${API_BASE_URL}api/event/admin/examdates`, {
            method: "PUT",
            credentials: "include",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ firstYearDates, otherDates }),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || result.error || "Failed to save exam dates");
        return result;
    } catch (error) {
        console.error("Error saving exam dates:", error);
        throw error;
    }
};
