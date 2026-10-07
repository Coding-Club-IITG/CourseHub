import axios from "axios";
axios.defaults.withCredentials = true;
import root from "./server";

export const getCourse = async (code) => {
    const resp = await axios.get(`${root}/api/course/${code}`);
    return resp;
};

export const getUserCourses = async (courses) => {
    try {
        const resp = await axios.get(`${root}/api/course/getUserCourses`, {
            params: {
                courses: courses,
            },
        });
        return resp.data;
    } catch (err) {
    }
};

export const fetchUserCoursesData = async (user) => {
    const [coursesResult, previousCoursesResult] = await Promise.allSettled([
        axios.post(`${root}/api/auth/fetchCourses`, {
            rollNumber: user.rollNumber,
        }),
        axios.post(`${root}/api/auth/fetchPreviousCourses`),
    ]);

    if (coursesResult.status === "rejected" && previousCoursesResult.status === "rejected") {
        throw coursesResult.reason;
    }

    return {
        courses: coursesResult.status === "fulfilled"
            ? coursesResult.value.data.courses
            : user.courses || [],
        previousCourses: previousCoursesResult.status === "fulfilled"
            ? previousCoursesResult.value.data.courses
            : user.previousCourses || [],
    };
};
