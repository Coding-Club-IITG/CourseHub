import axios from "axios";
import serverRoot from "./server";

let redirectUri = "http://localhost:8080/api/auth/login/redirect";

axios.defaults.withCredentials = true;

export const getUser = async () => {
    const resp = await axios.get(`${serverRoot}/api/user`);
    return resp;
};
export const updateUser = async (newUserData) => {
    const resp = await axios.put(`${serverRoot}/api/user/update`, { newUserData });
    return resp;
};

export const handleLogin = () => {
    window.location = `https://login.microsoftonline.com/850aa78d-94e1-4bc6-9cf3-8c11b530701c/oauth2/v2.0/authorize?client_id=89fc28dc-5aaf-471b-a9bf-f7411b5527f7&response_type=code&redirect_uri=http://localhost:8080/api/auth/login/redirect&scope=offline_access%20user.read&state=12345&prompt=consent`;
};
export const AddNewCourseAPI = async (code, name) => {
    const resp = await axios.post(`${serverRoot}/api/user/course`, { code, name });
    // console.log(resp);
    return resp;
};
export const DeleteCourseAPI = async (code) => {
    const resp = await axios.delete(`${serverRoot}/api/user/course/${code}`);
    // console.log(resp);
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
    // console.log(resp);
    return resp;
};
export const RemoveFromFavourites = async (id) => {
    const resp = await axios.delete(`${serverRoot}/api/user/favourites/${id}`);
    // console.log(resp);
    return resp;
};
export const GetExamDates = async () => {
    const resp = await axios.get(`${serverRoot}/api/event/examdates`);
    return resp;
};
