import axios from "axios";
import serverRoot from "./server";
import { Children } from "react";
const API = axios.create({
    baseURL: `${serverRoot}/api`,
    withCredentials: true,
});
API.interceptors.request.use((req) => {
    const user = JSON.parse(localStorage.getItem("profile"));
    if (user) req.headers.Authorization = `Bearer ${user.token}`;
    return req;
});

export const addYear = async ({ name, course }) => {
    const { data } = await API.post("/year", {
        name,
        course,
        childType: "Folder",
        Children: [],
    });
    return data;
};

export const deleteYear = async ({ folder, courseCode }) => {
    const { data } = await API.delete("/year/delete", {
        data: { folder, courseCode },
    });
    return data;
};
