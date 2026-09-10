import { normalizeCourseCode } from "@coursehub/domain";

export function resourcePath(code, folderId, fileId) {
    const path = `/browse/${encodeURIComponent(normalizeCourseCode(code))}/${encodeURIComponent(folderId)}`;
    return fileId ? `${path}?file=${encodeURIComponent(fileId)}` : path;
}
export const resourceLink = (code, folderId, fileId) =>
    new URL(resourcePath(code, folderId, fileId), window.location.origin).href;
