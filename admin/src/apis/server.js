const base = import.meta.env.VITE_API_BASE_URL || "/";

export const API_BASE_URL = base.endsWith("/") ? base : `${base}/`;
