import { QueryClient } from "@tanstack/react-query";

export function createSession({ transport, role, path, selectActor = (data) => data }) {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: { retry: false, staleTime: 30_000, gcTime: 300_000 },
            mutations: { retry: false },
        },
    });
    const key = ["session", role];
    const clear = (cancelSession = true) => {
        transport.endSession();
        queryClient.cancelQueries({
            predicate: (query) => cancelSession || query.queryKey[0] !== "session",
        });
        queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== "session" });
        queryClient.setQueryData(key, null);
    };
    const scope = (actor) => JSON.stringify([actor?._id || actor?.userId, actor?.capabilities]);
    const checkActor = (actor) => {
        if (scope(actor) !== scope(queryClient.getQueryData(key)))
            queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== "session" });
        return actor;
    };
    transport.onUnauthorized(() => clear(false));
    const options = {
        queryKey: key,
        staleTime: 60_000,
        refetchInterval: 60_000,
        queryFn: async ({ signal }) => {
            // Strict Mode can unsubscribe before the first request has left the browser
            await Promise.resolve();
            signal.throwIfAborted();
            try {
                return checkActor(selectActor(await transport.json(path, { signal })));
            } catch (error) {
                if (error.status === 401) return null;
                throw error;
            }
        },
    };
    return {
        queryClient,
        options,
        clear,
        refresh: () => queryClient.fetchQuery({ ...options, staleTime: 0 }),
        setActor: (actor) =>
            queryClient.setQueryData(key, (current) =>
                checkActor(
                    typeof actor === "function" ? (current ? actor(current) : current) : actor,
                ),
            ),
    };
}
