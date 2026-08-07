import { API_BASE_URL } from "./server.js";

// Fetch all branch representatives
export const fetchBRs = async () => {
    try {
        const response = await fetch(`${API_BASE_URL}api/br/allBRs`, {
            credentials: "include",
            headers: {
                Authorization: "Bearer admin-coursehub-cc23-golang",
            },
        });
        return await response.json();
    } catch (error) {
        console.error("Error fetching BRs:", error);
        throw error;
    }
};

// Create a single BR
export const createBR = async (email) => {
    try {
        const response = await fetch(`${API_BASE_URL}api/br/create`, {
            method: "POST",
            credentials: "include",
            headers: {
                "Content-Type": "application/json",
                Authorization: "Bearer admin-coursehub-cc23-golang",
            },
            body: JSON.stringify({ email }),
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || result.message || "Failed to create BR");
        }

        return result;
    } catch (error) {
        console.error("Error creating single BR:", error);
        throw error;
    }
};

// Parse CSV and upload BRs
export const uploadBRs = async (file) => {
    try {
        // Parse CSV file
        const csvText = await file.text();
        const lines = csvText.split("\n").filter((line) => line.trim() !== "");

        // Skip header row and extract emails
        const emails = [];
        for (let i = 1; i < lines.length; i++) {
            const email = lines[i].trim().replace(/"/g, ""); // Remove quotes if any
            if (email && email.includes("@")) {
                // Basic email validation
                emails.push({ email: email });
            }
        }

        if (emails.length === 0) {
            throw new Error("No valid emails found in the CSV file");
        }

        // Call backend API
        const response = await fetch(`${API_BASE_URL}api/br/updateList`, {
            method: "POST",
            credentials: "include",
            headers: {
                "Content-Type": "application/json",
                Authorization: "Bearer admin-coursehub-cc23-golang",
            },
            body: JSON.stringify({ emails }),
        });

        const result = await response.json();

        if (!response.ok) {
            throw result;
        }

        return result;
    } catch (error) {
        console.error("Error uploading BRs:", error);
        throw error;
    }
};
// Delete BR
export const deleteBR = async (email) => {
    try {
        const response = await 
        fetch(`${API_BASE_URL}api/br/delete`,{
            method: "DELETE",
            credentials: "include",
            headers:{
                "Content-Type":"application/json",
                Authorization:"Bearer admin-coursehub-cc23-golang"},
            body: JSON.stringify({email:email}),
        });
        const result = await response.json();
        if(!response.ok){
            throw new Error(result.error || result.message || "Failed to delete BR");
        }    
        return result ;
        }
        catch (error){
            console.error("Error deleting single BR:" , error);
            throw error;
        }
};
