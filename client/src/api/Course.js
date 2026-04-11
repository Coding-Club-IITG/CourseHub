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
    const [coursesRes, prevCoursesRes] = await Promise.all([
        axios.post(`${root}/api/auth/fetchCourses`, {
            rollNumber: user.rollNumber,
        }),
        user.isBR
            ? axios.post(`${root}/api/auth/fetchCoursesForBr`, {
                  rollNumber: user.rollNumber,
              })
            : Promise.resolve({ data: { courses: [] } }),
    ]);

    return {
        courses: coursesRes.data.courses,
        previousCourses: prevCoursesRes.data.courses,
    };
};
