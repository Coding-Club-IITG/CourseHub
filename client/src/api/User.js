import axios from "axios";
import serverRoot from "./server";

let redirectUri = "https://www.coursehubiitg.in/api/auth/login/redirect";

axios.defaults.withCredentials = true;

export const getUser = async () => {
    const resp = await axios.get(`${serverRoot}/api/user`, {
        withCredentials: true,
    });
    return resp;
};
export const updateUser = async (newUserData) => {
    const resp = await axios.put(`${serverRoot}/api/user/update`, { newUserData });
    return resp;
};

export const handleLogin = () => {
    window.location.href = `${serverRoot}/api/auth/login`;
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
