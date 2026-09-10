import config from "./default.js";

export const sessionSeconds = { student: 24 * 24 * 60 * 60, admin: 7 * 24 * 60 * 60 };
export const cookieNames = { student: "token", admin: "adminToken" };
export const cookieOptions = () => ({
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.COOKIE_SAME_SITE || "lax",
    path: "/",
});

export function allowedOrigins() {
    const values = process.env.ALLOWED_ORIGINS?.split(",") || [
        config.clientURL,
        config.localApiBaseUrl,
        ...(process.env.NODE_ENV === "production"
            ? []
            : [
                  "http://localhost:5173",
                  "http://localhost:5174",
                  "http://127.0.0.1:4183",
                  "http://127.0.0.1:4184",
              ]),
    ];
    return new Set(
        values
            .filter((value) => value?.trim())
            .map((value) => {
                const url = new URL(value.trim());
                if (
                    !["http:", "https:"].includes(url.protocol) ||
                    url.username ||
                    url.password ||
                    url.pathname !== "/" ||
                    url.search ||
                    url.hash
                )
                    throw new Error("ALLOWED_ORIGINS must contain HTTP(S) origins without paths");
                return url.origin;
            }),
    );
}

export function validateSecuritySettings() {
    if (!allowedOrigins().size) throw new Error("Configure ALLOWED_ORIGINS");
    const options = cookieOptions();
    if (
        !["lax", "strict", "none"].includes(options.sameSite) ||
        (options.sameSite === "none" && !options.secure)
    )
        throw new Error("COOKIE_SAME_SITE must be lax, strict, or none with production HTTPS");
    const hops = Number(process.env.TRUST_PROXY_HOPS || 0);
    if (!Number.isInteger(hops) || hops < 0 || hops > 10)
        throw new Error("TRUST_PROXY_HOPS must be an integer from 0 to 10");
    return hops;
}
