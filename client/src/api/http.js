import axios from "axios";
import server from "./server";
import { getCsrfToken, setCsrfToken, clearCsrfToken } from "./csrf";

const http = axios.create({ baseURL: `${server}/api`, withCredentials: true });
http.interceptors.request.use(async (request) => {
    request.headers["X-Session-Role"] = "student";
    if (!["get", "head", "options"].includes(request.method))
        request.headers["X-CSRF-Token"] = await getCsrfToken();
    return request;
});
http.interceptors.response.use(
    (response) => {
        if (response.data?.csrfToken) setCsrfToken(response.data.csrfToken);
        return response;
    },
    async (error) => {
        if (error.response?.status === 401) clearCsrfToken();
        if (error.response?.data?.code === "CSRF_INVALID" && !error.config._csrfRetried) {
            error.config._csrfRetried = true;
            await getCsrfToken(true);
            return http(error.config);
        }
        throw error;
    },
);
export default http;
