import { toast } from "react-toastify";
import server from "./server";
import { getUser } from "./User";
import { getCourse } from "./Course";

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
                course,
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
        const events = data.data.filter(event => {
            const currDate = new Date();
            const eventDate = new Date(event.eventDate);
            if (eventDate.getTime() >= currDate.getTime()){
                return true;
            }
            else{
                deleteQuizEvent(event._id);
                return false;
            }
        })
        return events || [];
    } catch (error) {
        throw error;
    }
};

export const getQuizEvents = async () => {
    try {
        console.log("Getting Quizzes")
        const { data: user } = await getUser();
        if(!user) {
            throw new Error('User not found');
        }
        const response = await fetch(`${server}/api/quiz/events`, {
            method: 'GET',
            credentials: 'include'
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Failed to fetch quiz events');
        }
        if(data.data) {
        // const userEvents = data.data.filter(event =>
        //     user?.courses?.some(course => course.code === event.course)
        // );
        const userEvents = data.data.filter(event =>{
            if (user?.courses?.some(course => course.code === event.course)){
                const currDate = new Date();
                const eventDate = new Date(event.eventDate);
                if(eventDate.getTime() >= currDate.getTime()){
                    return true;
                }
                else{
                    deleteQuizEvent(event._id);
                    return false;
                }
            }
        })
            return userEvents;
        } else {
            throw new Error(data.message || 'Failed to fetch quiz events data');
        }
    } catch (error) {
        throw error;
    }
};

export const modifyQuizEvent = async (eventId, eventData) => {
    try {
        const response = await fetch(`${server}/api/quiz/modify/${eventId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify(eventData)
        });
        const data = await response.json();
        if(!response.ok) {
            toast.error(data.message || 'Failed to modify quiz event');
            return null;
        }
        return data;
    }
    catch (error) {
        toast.error(error.message || 'Failed to modify quiz event');
        return null;
    }
}
export const deleteQuizEvent = async (eventId) => {
    try {
        console.log("deleting Quizzes")
        const response = await fetch(`${server}/api/quiz/delete/${eventId}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        const data = await response.json();
        if(!response.ok) {
            toast.error(data.message || 'Failed to delete quiz event');
            return null;
        }
        return data;
    }
    catch (error) {
        toast.error(error.message || 'Failed to delete quiz event');
        return null;
    }
}
