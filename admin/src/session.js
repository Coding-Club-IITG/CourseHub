import { createLibraryCache, createSession, useQuery } from "@coursehub/browser";
import { transport } from "./apis/http";
export const session = createSession({
    transport,
    role: "admin",
    path: "admin/",
    selectActor: (data) => data.user,
});
export function useSession() {
    return useQuery(session.options);
}

export const library = createLibraryCache(session, transport, "admin");
if (import.meta.hot) import.meta.hot.dispose(() => library.dispose());
