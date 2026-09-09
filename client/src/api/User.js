import axios from "./http";
import serverRoot from "./server";
import { clearAllCoursesCache } from "../utils/frontendCache";

import { clearCsrfToken } from "./csrf";
import { loginDestination } from "../utils/loginDestination";

export const getUser = async (signal) => {
    clearAllCoursesCache();
    const resp = await axios.get(`${serverRoot}/api/user`, {
        withCredentials: true,
        signal,
    });
    return resp;
};
export const updateUser = async (newUserData) => {
    const resp = await axios.put(`${serverRoot}/api/user/update`, { newUserData });
    return resp;
};

export const handleLogin = () => {
    const destination = loginDestination(
        new URLSearchParams(window.location.search).get("returnTo"),
    );
    window.location.href = `${serverRoot}/api/auth/login?returnTo=${encodeURIComponent(destination)}`;
};
export const AddNewCourseAPI = async (code, name) => {
    const resp = await axios.post(`${serverRoot}/api/user/readonly`, { code, name });
    return resp;
};
export const DeleteCourseAPI = async (code) => {
    const resp = await axios.delete(`${serverRoot}/api/user/readonly/${code}`);
    return resp;
};

export const AddToFavourites = async (id, name, path, code) => {
    const data = {
        id: id,
        name: name,
        path: path,
        code: code,
    };
    const resp = await axios.post(`${serverRoot}/api/user/favourites`, data);
    return resp;
};
export const RemoveFromFavourites = async (id) => {
    const resp = await axios.delete(`${serverRoot}/api/user/favourites/${id}`);
    return resp;
};
export const GetExamDates = async () => {
    const resp = await axios.get(`${serverRoot}/api/event/examdates`);
    return resp;
};

export const logoutUser = async () => {
    try {
        await axios.post(`${serverRoot}/api/auth/logout`);
    } catch (error) {
        if (error.response?.status !== 401) throw error;
    }
    clearCsrfToken();
};
