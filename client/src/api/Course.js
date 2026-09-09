import axios from "./http";
import root from "./server";

export const getCourse = async (code) => {
    const resp = await axios.get(`${root}/api/course/${code}`);
    return resp;
};

export const synchronizeCourses = async (signal) =>
    (await axios.post(`${root}/api/user/synchronize`, {}, { signal })).data;
