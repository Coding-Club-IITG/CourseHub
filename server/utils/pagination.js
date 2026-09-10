import AppError from "./appError.js";
const integer = (value, fallback, max, name) => {
    if (value === undefined) return fallback;
    if (typeof value !== "string" || !/^[1-9]\d*$/.test(value) || Number(value) > max)
        throw new AppError(
            400,
            `${name} must be an integer between 1 and ${max}`,
            "INVALID_PAGINATION",
        );
    return Number(value);
};
export function listParameters(query) {
    const page = integer(query.page, 1, 1000000, "page");
    const pageSize = integer(query.pageSize, 20, 100, "pageSize");
    if (query.q !== undefined && (typeof query.q !== "string" || query.q.length > 120))
        throw new AppError(400, "Search must contain at most 120 characters", "INVALID_SEARCH");
    return { page, pageSize, q: (query.q || "").trim() };
}
export const escapeSearch = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
export function pageFacet({ page, pageSize }) {
    return {
        $facet: {
            items: [{ $skip: (page - 1) * pageSize }, { $limit: pageSize }],
            total: [{ $count: "value" }],
        },
    };
}
export function pageResult(result, { page, pageSize }) {
    return { items: result?.items || [], page, pageSize, total: result?.total?.[0]?.value || 0 };
}
