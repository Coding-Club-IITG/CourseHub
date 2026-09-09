import { createSession, createLibraryCache } from "@coursehub/browser";
import { transport } from "../api/http";
export const session = createSession({ transport, role: "student", path: "user" });

export const library = createLibraryCache(session, transport, "student");
if (import.meta.hot) import.meta.hot.dispose(() => library.dispose());
