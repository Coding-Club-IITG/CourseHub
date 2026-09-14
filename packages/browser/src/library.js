import { replaceEqualDeep } from "@tanstack/react-query";

import { normalizeCourseCode as normalize } from "@coursehub/domain";
import { persistCourseQueries } from "./coursePersistence.js";
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
    const persistence =
        role === "student" && transport.baseUrl
            ? persistCourseQueries({ session, key, namespace: `${role}:${transport.baseUrl}` })
            : null;
    const invalidate = (codes = [], broadcast = true, kinds = []) => {
        const normalized = codes.filter((value) => typeof value === "string").map(normalize);
        const references = kinds.filter((kind) => ["students", "student-detail"].includes(kind));
        if (role === "student") client.invalidateQueries({ queryKey: session.options.queryKey });
        if (broadcast)
            channel?.postMessage({ type: "changed", codes: normalized, kinds: references });
        const predicate = (query) => {
            if (query.queryKey[0] !== "library") return false;
            if (references.includes(query.queryKey[4])) return true;
            if (query.queryKey[4] === "contributions") return true;
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
        };
        persistence?.invalidate(predicate);
        return client.invalidateQueries({ predicate });
    };
    if (channel)
        channel.onmessage = (event) => {
            if (event.data?.type === "changed")
                invalidate(
                    Array.isArray(event.data.codes) ? event.data.codes : [],
                    false,
                    Array.isArray(event.data.kinds) ? event.data.kinds : [],
                );
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
        const changesReferences = ["academic-sync", "rename", "delete"].includes(operation.kind);
        invalidate(
            operation.affectedCourses || operation.courseCodes || [],
            true,
            changesReferences ? ["students", "student-detail"] : [],
        );
        if (role !== "student" && changesReferences)
            client.invalidateQueries({ queryKey: session.options.queryKey });
    };
    const unsubscribe = transport.onResponse(
        ({ url, method, data }) => {
            if (url.pathname.includes("/operations/")) observeOperation(data);
            if (["GET", "HEAD", "OPTIONS"].includes(method)) return;
            if (/\/auth\/logout$/.test(url.pathname))
                channel?.postMessage({ type: "logout", role });
            if (
                /\/(folder|year)(\/|$)|\/files\/(verify|unverify|rename)\/|\/course\/(create|[^/]+\/(delete|link|dashboard))|\/admin\/(course|contribution|node)|\/br\//.test(
                    url.pathname,
                )
            ) {
                invalidate(data?.affectedCourses || data?.file?.affectedCourses || []);
            }
        },
        {
            matches: ({ url, method }) =>
                url.pathname.includes("/operations/") ||
                !["GET", "HEAD", "OPTIONS"].includes(method),
        },
    );
    return {
        key,
        invalidate,
        observeOperation,
        options(kind, code, queryFn) {
            return {
                queryKey: key(kind, code),
                queryFn,
                staleTime: 15_000,
                gcTime: 30 * 60_000,
                refetchInterval: 30_000,
                refetchOnMount: true,
                refetchOnWindowFocus: true,
                refetchOnReconnect: true,
                structuralSharing: (previous, next) =>
                    next?.revision &&
                    next.revision === previous?.revision &&
                    !persistence?.isRestored(previous)
                        ? previous
                        : replaceEqualDeep(previous, next),
            };
        },
        dispose() {
            persistence?.dispose();
            unsubscribe();
            channel?.close();
        },
    };
}
