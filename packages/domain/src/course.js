export const normalizeCourseCode = (value) =>
    value == null ? "" : String(value).toUpperCase().replace(/\s+/g, "");

export const isCourseCode = (value) =>
    typeof value === "string" && /^[A-Z0-9][A-Z0-9._-]{0,63}$/.test(normalizeCourseCode(value));
