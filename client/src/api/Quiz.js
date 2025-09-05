import { toast } from "react-toastify";
import server from "./server";
import { getUser } from "./User";
import { getCourse } from "./Course";

export const createQuizEvent = async (eventName, eventDate, course) => {
    try {
        // const courseName = await getCourse(course);
        // if (!courseName) throw new Error("Course not found");

        const response = await fetch(`${server}/api/quiz/create`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            credentials: "include",
            body: JSON.stringify({
                eventName,
                eventDate,
                course,
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || "Failed to create quiz event");
        }

        return data;
    } catch (error) {
        throw error;
    }
};

export const getQuizEvents = async () => {
    try {
        const { data: user } = await getUser();
        if (!user) {
            throw new Error("User not found");
        }
        console.log("User data:", user.user);
        const response = await fetch(`${server}/api/quiz/events`, {
            method: "GET",
            credentials: "include",
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || "Failed to fetch quiz events");
        }
        console.log("All quiz events data:", data.data);
        if (data.data) {
            const userEvents = data.data.filter((event) =>
                user?.courses.some((course) => course.code === event.course)
            );
            console.log("User-specific quiz events:", userEvents);
            return userEvents;
        } else {
            throw new Error(data.message || "Failed to fetch quiz events data");
        }
    } catch (error) {
        throw error;
    }
};
