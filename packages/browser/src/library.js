import { replaceEqualDeep } from "@tanstack/react-query";

import { normalizeCourseCode as normalize } from "@coursehub/domain";
const actorScope = (actor) => [
    actor?._id || actor?.userId || "anonymous",
    actor?.capabilities || {},
];
export function createLibraryCache(session, transport, role) {
    const client = session.queryClient;
    const prefix = ["library", role];
    let channel;
    try {
        if (typeof window !== "undefined" && typeof BroadcastChannel !== "undefined")
            channel = new BroadcastChannel("coursehub-library");
    } catch {
        /* Focus, reconnect and polling still work without cross-tab messaging */
    }
    const key = (kind, code = "") => [
        ...prefix,
        ...actorScope(client.getQueryData(session.options.queryKey)),
        kind,
        normalize(code),
    ];
    const invalidate = (codes = [], broadcast = true) => {
        const normalized = codes.filter((value) => typeof value === "string").map(normalize);
        if (role === "student") client.invalidateQueries({ queryKey: session.options.queryKey });
        if (broadcast) channel?.postMessage({ type: "changed", codes: normalized });
        return client.invalidateQueries({
            predicate: (query) => {
                if (query.queryKey[0] !== "library") return false;
                if (!normalized.length || query.queryKey[4] === "courses") return true;
                if (normalized.includes(query.queryKey[5])) return true;
                if (
                    normalized.includes(
                        normalize(query.state.data?.code || query.state.data?.course?.code),
                    )
                )
                    return true;
                // Existing cached trees also identify siblings of a shared resource
                const pending = [query.state.data?.course || query.state.data];
                while (pending.length) {
                    const item = pending.pop();
                    if (
                        (item?.affectedCourses || item?.courses || []).some((code) =>
                            normalized.includes(normalize(code)),
                        )
                    )
                        return true;
                    if (item?.childType !== "File") pending.push(...(item?.children || []));
                }
                return false;
            },
        });
    };
    if (channel)
        channel.onmessage = (event) => {
            if (event.data?.type === "changed")
                invalidate(Array.isArray(event.data.codes) ? event.data.codes : [], false);
            if (event.data?.type === "logout" && event.data.role === role) session.clear();
        };
    const completed = new Map();
    const observeOperation = (operation) => {
        if (
            !operation?.id ||
            !["completed", "partial", "failed", "cancelled"].includes(operation.status)
        )
            return;
        const revision = JSON.stringify([
            operation.updatedAt,
            operation.status,
            operation.entries?.map((entry) => [entry.id, entry.state]),
        ]);
        if (completed.get(operation.id) === revision) return;
        completed.set(operation.id, revision);
        if (completed.size > 100) completed.delete(completed.keys().next().value);
        invalidate(operation.affectedCourses || operation.courseCodes || []);
        if (["academic-sync", "rename", "delete"].includes(operation.kind))
            client.invalidateQueries({ queryKey: session.options.queryKey });
    };
    const unsubscribe = transport.onResponse(({ url, method, data }) => {
        if (url.pathname.includes("/operations/")) observeOperation(data);
        if (["GET", "HEAD", "OPTIONS"].includes(method)) return;
        if (/\/auth\/logout$/.test(url.pathname)) channel?.postMessage({ type: "logout", role });
        if (
            /\/(folder|year)(\/|$)|\/files\/(verify|unverify|rename)\/|\/course\/(create|[^/]+\/(delete|link|dashboard))|\/admin\/(course|contribution|node)|\/br\//.test(
                url.pathname,
            )
        ) {
            invalidate(data?.affectedCourses || data?.file?.affectedCourses || []);
        }
    });
    return {
        key,
        invalidate,
        observeOperation,
        options(kind, code, queryFn) {
            return {
                queryKey: key(kind, code),
                queryFn,
                staleTime: 15_000,
                refetchInterval: 30_000,
                refetchOnMount: "always",
                refetchOnWindowFocus: "always",
                refetchOnReconnect: "always",
                structuralSharing: (previous, next) =>
                    next?.revision && next.revision === previous?.revision
                        ? previous
                        : replaceEqualDeep(previous, next),
            };
        },
        dispose() {
            unsubscribe();
            channel?.close();
        },
    };
}
