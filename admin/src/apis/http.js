import { createTransport } from "@coursehub/browser";
import { API_BASE_URL } from "./server";
export const transport = createTransport({ baseUrl: API_BASE_URL + "api/", role: "admin" });
export const apiFetch = transport.request;
export const { getCsrfToken, setCsrfToken, clearCsrfToken } = transport;
