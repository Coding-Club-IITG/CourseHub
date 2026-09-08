import { createSession } from "../../services/sessions.js";
import { cookieNames } from "../../config/security.js";

export const testOrigin = "http://client.coursehub.test";
export const testCsrfToken = "c".repeat(43);
export async function sessionHeaders(actorId, role = "student") {
    const { token, session } = await createSession(actorId, role);
    return {
        cookie: `${cookieNames[role]}=${token}`,
        origin: testOrigin,
        "x-csrf-token": session.csrfToken,
        "x-session-role": role,
    };
}
