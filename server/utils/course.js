export const normalizeCourseCode = (code) => {
    if (!code) return "";
    return code.toString().toUpperCase().replace(/\s+/g, "");
};

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const getCourseCodeCaseInsensitiveRegex = (code) => {
    const normalizedCode = normalizeCourseCode(code);
    return new RegExp(`^${escapeRegex(normalizedCode)}$`, "i");
};
