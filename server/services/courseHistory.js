// Older accounts stored previous courses as a flat list
export function normalizeCourseHistory(value) {
    if (!Array.isArray(value)) return value;
    const groups = [],
        legacy = [];
    for (const entry of value) {
        if (entry && typeof entry.code === "string" && entry.courses === undefined)
            legacy.push(entry);
        else groups.push(entry);
    }
    if (legacy.length) groups.push({ courses: legacy });
    return groups;
}
