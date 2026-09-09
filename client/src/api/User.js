import { session } from "../session/runtime";
import { ApiError } from "@coursehub/browser";
import { transport } from "./http";
import serverRoot from "./server";

import { loginDestination } from "../utils/loginDestination";

export const getUser = async (signal) => {
    signal?.throwIfAborted();
    const data = await session.refresh();
    signal?.throwIfAborted();
    if (!data) throw new ApiError(401);
    return data;
};
export const updateUser = (newUserData) =>
    transport.json("user/update", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newUserData }),
    });

export const handleLogin = () => {
    const destination = loginDestination(
        new URLSearchParams(window.location.search).get("returnTo"),
    );
    window.location.href = `${serverRoot}/api/auth/login?returnTo=${encodeURIComponent(destination)}`;
};
export const AddNewCourseAPI = (code, name) =>
    transport.json("user/readonly", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, name }),
    });
export const DeleteCourseAPI = (code) =>
    transport.json(`user/readonly/${code}`, { method: "DELETE" });

export const AddToFavourites = (id, code) =>
    transport.json("user/favourites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, code }),
    });
export const RemoveFromFavourites = (id) =>
    transport.json(`user/favourites/${id}`, { method: "DELETE" });
export const GetExamDates = () => transport.json("event/examdates");

export const logoutUser = async () => {
    try {
        await transport.json("auth/logout", { method: "POST" });
    } catch (error) {
        if (error.status !== 401) throw error;
    }
    session.clear();
};
