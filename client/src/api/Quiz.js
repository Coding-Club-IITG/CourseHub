import server from "./server";

export const createQuizEvent = async (eventName, eventDate, course) => {
    try {
        const response = await fetch(`${server}/api/quiz/create`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({
                eventName,
                eventDate,
                course
            })
        });

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || 'Failed to create quiz event');
        }

        return data;
    } catch (error) {
        throw error;
    }
};

export const getAllQuizEvents = async () => {
    try {
        const response = await fetch(`${server}/api/quiz/events`, {
            method: 'GET',
            credentials: 'include'
        });

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || 'Failed to fetch quiz events');
        }
        console.log(data.data);

        return data.data;
    } catch (error) {
        throw error;
    }
};
