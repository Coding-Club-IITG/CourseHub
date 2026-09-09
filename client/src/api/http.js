import { createTransport } from "@coursehub/browser";
import server from "./server";
export const transport = createTransport({ baseUrl: server + "/api/", role: "student" });
