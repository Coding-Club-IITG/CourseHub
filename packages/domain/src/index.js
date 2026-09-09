export const normalizeCourseCode = (value) =>
    value == null ? "" : String(value).toUpperCase().replace(/\s+/g, "");

export const isCourseCode = (value) =>
    typeof value === "string" && /^[A-Z0-9][A-Z0-9._-]{0,63}$/.test(normalizeCourseCode(value));

export const folderChildTypes = Object.freeze(["File", "Folder"]);
export const uploadLimits = Object.freeze({
    fileBytes: 100 * 1024 * 1024,
    files: 40,
    batchBytes: 1024 * 1024 * 1024,
    concurrentFiles: 2,
});

export const isUploadLimits = (value) =>
    ["fileBytes", "files", "batchBytes", "concurrentFiles"].every(
        (key) => Number.isSafeInteger(value?.[key]) && value[key] > 0,
    );

export const formatUploadBytes = (value) =>
    value >= 1024 ** 3 ? `${value / 1024 ** 3} GiB` : `${value / 1024 ** 2} MiB`;

export const uploadLimitsLabel = (limits = uploadLimits) =>
    `${formatUploadBytes(limits.fileBytes)} per file · ${limits.files} files · ${formatUploadBytes(limits.batchBytes)} per batch`;

export const uploadLimitsError = (limits = uploadLimits) =>
    `Choose up to ${limits.files} files, no more than ${formatUploadBytes(limits.fileBytes)} each and ${formatUploadBytes(limits.batchBytes)} in total.`;
