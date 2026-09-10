export function loginDestination(value) {
    if (
        typeof value !== "string" ||
        !value.startsWith("/") ||
        value.startsWith("//") ||
        /[\\\r\n]/.test(value)
    )
        return "/dashboard";
    const url = new URL(value, window.location.origin);
    if (
        url.origin !== window.location.origin ||
        url.pathname.startsWith("/api/") ||
        ["/", "/loading"].includes(url.pathname)
    )
        return "/dashboard";
    return url.pathname + url.search + url.hash;
}
