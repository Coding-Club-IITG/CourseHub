import { hashKey } from "@tanstack/react-query";
import { normalizeCourseCode } from "@coursehub/domain";

const version = 1;
const maxAge = 24 * 60 * 60_000;
const maxCourses = 20;
const maxLength = 1_000_000; // About 2 MB
const gcTime = 30 * 60_000;
const validCapabilities = (value) =>
    ["canManage", "canModerate", "canContribute"].every(
        (name) => typeof value?.[name] === "boolean",
    );

const validNode = (node) =>
    node &&
    typeof node._id === "string" &&
    /^[a-f0-9]{24}$/i.test(node._id) &&
    typeof node.name === "string" &&
    validCapabilities(node.capabilities) &&
    ["affectedCourses", "courses"].every(
        (field) =>
            node[field] === undefined ||
            (Array.isArray(node[field]) && node[field].every((code) => typeof code === "string")),
    ) &&
    (node.contributorName == null || typeof node.contributorName === "string");

function validCourse(course) {
    if (
        !validNode(course) ||
        typeof course.code !== "string" ||
        !normalizeCourseCode(course.code) ||
        typeof course.revision !== "string" ||
        !Array.isArray(course.children)
    )
        return false;
    const pending = course.children.map((node) => [node, 1]);
    let count = 0;
    while (pending.length) {
        const [node, depth] = pending.pop();
        if (++count > 20_000 || depth > 64 || !validNode(node) || !Array.isArray(node.children))
            return false;
        if (node.childType === "Folder")
            pending.push(...node.children.map((child) => [child, depth + 1]));
        else if (node.childType === "File") {
            count += node.children.length;
            if (
                count > 20_000 ||
                node.children.some(
                    (file) => !validNode(file) || typeof file.isVerified !== "boolean",
                )
            )
                return false;
        } else return false;
    }
    return true;
}

function browserStorage() {
    try {
        return globalThis.sessionStorage;
    } catch {
        return undefined;
    }
}

export function persistCourseQueries({ session, key, namespace, storage = browserStorage() }) {
    if (!storage) return { isRestored: () => false, invalidate() {}, dispose() {} };
    const client = session.queryClient;
    const cache = client.getQueryCache();
    const storageKey = `coursehub-course-trees:${namespace}`;
    const records = new Map();
    const blocked = new Set();
    const restored = new WeakSet();
    let scope = null,
        restoring = false,
        timer;
    const removeStored = () => {
        try {
            storage?.removeItem(storageKey);
        } catch {
            /* Browsing must also work with storage disabled */
        }
    };
    const current = (query) =>
        scope &&
        query.queryKey.length === 6 &&
        query.queryKey[4] === "course" &&
        hashKey(query.queryKey.slice(0, 4)) === scope;
    const unexpired = (entry) =>
        Number.isFinite(entry.updatedAt) &&
        entry.updatedAt > 0 &&
        entry.updatedAt <= Date.now() &&
        Date.now() - entry.updatedAt < maxAge;
    const flush = () => {
        clearTimeout(timer);
        timer = undefined;
        if (!scope) return;
        let entries = [...records.values()]
            .filter(unexpired)
            .sort((a, b) => b.updatedAt - a.updatedAt)
            .filter((entry) => {
                try {
                    return JSON.stringify(entry).length < maxLength / 2;
                } catch {
                    return false;
                }
            })
            .slice(0, maxCourses);
        while (entries.length) {
            try {
                const value = JSON.stringify({ version, scope, entries });
                if (value.length <= maxLength) {
                    storage?.setItem(storageKey, value);
                    break;
                }
            } catch {
                // A smaller snapshot may fit the remaining quota
            }
            entries.pop();
        }
        records.clear();
        for (const entry of entries) records.set(entry.code, entry);
        if (!entries.length) removeStored();
    };
    const reset = () => {
        clearTimeout(timer);
        timer = undefined;
        scope = null;
        records.clear();
        blocked.clear();
        removeStored();
    };
    const restore = () => {
        let saved;
        try {
            const text = storage?.getItem(storageKey);
            if (!text) return;
            if (text.length > maxLength) throw new Error("Cache is too large");
            saved = JSON.parse(text);
            if (
                saved.version !== version ||
                saved.scope !== scope ||
                !Array.isArray(saved.entries) ||
                saved.entries.length > maxCourses
            )
                throw new Error("Cache does not match this session");
        } catch {
            removeStored();
            return;
        }
        restoring = true;
        for (const entry of saved.entries) {
            if (
                !entry ||
                typeof entry.code !== "string" ||
                !entry.code ||
                entry.code !== normalizeCourseCode(entry.code) ||
                !unexpired(entry) ||
                !validCourse(entry.data)
            )
                continue;
            const queryKey = key("course", entry.code);
            if (client.getQueryData(queryKey) !== undefined) continue;
            records.set(entry.code, entry);
            cache.build(client, { queryKey, gcTime });
            restored.add(entry.data);
            // A restored result renders immediately but always revalidates on mount
            client.setQueryData(queryKey, entry.data, { updatedAt: 0 });
        }
        restoring = false;
        flush();
    };
    const unsubscribe = cache.subscribe((event) => {
        const { query, action } = event;
        if (hashKey(query.queryKey) === hashKey(session.options.queryKey)) {
            if (event.type === "removed") return reset();
            if (event.type !== "updated") return;
            if (
                action.type === "error" ||
                (action.type === "success" &&
                    typeof (query.state.data?._id || query.state.data?.userId) !== "string")
            ) {
                reset();
            } else if (action.type === "success") {
                const next = hashKey(key("course").slice(0, 4));
                if (scope && next !== scope) reset();
                // Only a successful bootstrap may restore data on a fresh page
                if (!scope && !action.manual) {
                    scope = next;
                    restore();
                }
            }
            return;
        }
        if (restoring || !current(query)) return;
        const code = query.queryKey[5];
        if (event.type === "removed") {
            blocked.delete(query.queryHash);
        } else if (event.type === "added") {
            const entry = records.get(code);
            if (entry && unexpired(entry) && query.state.data === undefined) {
                restored.add(entry.data);
                client.setQueryData(query.queryKey, entry.data, { updatedAt: 0 });
            }
        } else if (action?.type === "error" || action?.type === "invalidate") {
            if (action?.type === "invalidate" && query.state.fetchStatus === "fetching")
                blocked.add(query.queryHash);
            records.delete(code);
            flush();
        } else if (action?.type === "fetch") {
            blocked.delete(query.queryHash);
        } else if (action?.type === "success" && !action.manual) {
            restored.delete(query.state.data);
            if (blocked.has(query.queryHash) || !validCourse(query.state.data)) {
                records.delete(code);
                flush();
            } else {
                records.set(code, {
                    code,
                    data: query.state.data,
                    updatedAt: query.state.dataUpdatedAt,
                });
                clearTimeout(timer);
                timer = setTimeout(flush, 250);
            }
        }
    });
    const onVisibility = () => {
        if (document.visibilityState === "hidden") flush();
    };
    globalThis.addEventListener?.("pagehide", flush);
    globalThis.document?.addEventListener("visibilitychange", onVisibility);
    return {
        isRestored: (data) => restored.has(data),
        invalidate(predicate) {
            if (!scope) return removeStored();
            for (const entry of records.values())
                if (predicate({ queryKey: key("course", entry.code), state: { data: entry.data } }))
                    records.delete(entry.code);
            for (const query of cache.getAll())
                if (current(query) && predicate(query) && query.state.fetchStatus === "fetching")
                    blocked.add(query.queryHash);
            flush();
        },
        dispose() {
            flush();
            unsubscribe();
            globalThis.removeEventListener?.("pagehide", flush);
            globalThis.document?.removeEventListener("visibilitychange", onVisibility);
        },
    };
}
