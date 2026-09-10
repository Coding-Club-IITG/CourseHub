import { transport } from "./http";

export const getCourse = (code, signal) => transport.json(`course/${code}`, { signal });
export const synchronizeCourses = (signal) =>
    transport.json("user/synchronize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
        signal,
    });
