import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@coursehub/browser";
import { library } from "../session";
const positive = (value, fallback, max) =>
    /^[1-9]\d*$/.test(value || "") && Number(value) <= max ? Number(value) : fallback;
export function usePagedList(
    resource,
    fetcher,
    booleanFilters = [],
    { refetchInterval = false } = {},
) {
    const [params] = useSearchParams();
    const location = useLocation(),
        navigate = useNavigate();
    const setParams = useCallback(
        (updater, options) => {
            const next =
                typeof updater === "function"
                    ? updater(new URLSearchParams(location.search))
                    : new URLSearchParams(updater);
            navigate(
                {
                    pathname: location.pathname,
                    search: next.toString() ? "?" + next : "",
                    hash: location.hash,
                },
                options,
            );
        },
        [location.pathname, location.search, location.hash, navigate],
    );
    const filters = {
        q: (params.get("q") || "").slice(0, 120),
        page: positive(params.get("page"), 1, 1000000),
        pageSize: positive(params.get("pageSize"), 20, 100),
        ...Object.fromEntries(booleanFilters.map((key) => [key, params.get(key) === "true"])),
    };
    const [search, setSearch] = useState(filters.q);
    useEffect(() => setSearch(filters.q), [filters.q]);
    const query = useQuery({
        queryKey: [...library.key(resource), filters],
        queryFn: ({ signal }) => fetcher(filters, signal),
        retry: false,
        refetchInterval,
    });
    const update = (changes) =>
        setParams(
            (current) => {
                const next = new URLSearchParams(current);
                for (const [key, value] of Object.entries(changes)) {
                    if (value === "" || value === false || value === undefined) next.delete(key);
                    else next.set(key, String(value));
                }
                return next;
            },
            { replace: true },
        );
    useEffect(() => {
        if (search.trim() === filters.q) return;
        const timer = setTimeout(
            () =>
                setParams(
                    (current) => {
                        const next = new URLSearchParams(current);
                        if (search.trim()) next.set("q", search.trim());
                        else next.delete("q");
                        next.delete("page");
                        return next;
                    },
                    { replace: true },
                ),
            300,
        );
        return () => clearTimeout(timer);
    }, [search, filters.q, setParams]);
    useEffect(() => {
        if (!query.isSuccess) return;
        const last = Math.max(1, Math.ceil(query.data.total / filters.pageSize));
        if (filters.page > last)
            setParams(
                (current) => {
                    const next = new URLSearchParams(current);
                    next.set("page", String(last));
                    return next;
                },
                { replace: true },
            );
    }, [query.isSuccess, query.data?.total, filters.page, filters.pageSize, setParams]);
    const reset = () => {
        setSearch("");
        update(
            Object.fromEntries(
                ["q", "page", "pageSize", ...booleanFilters].map((key) => [key, undefined]),
            ),
        );
        if (
            !filters.q &&
            filters.page === 1 &&
            filters.pageSize === 20 &&
            booleanFilters.every((key) => !filters[key])
        )
            query.refetch();
    };
    return { query, filters, search, setSearch, update, reset };
}
