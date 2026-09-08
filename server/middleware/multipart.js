import AppError from "../utils/appError.js";

export const multipartLimits = Object.freeze({
    fieldArrayIndexLimit: 0,
    fieldNestingDepth: 0,
});

const invalidMultipart = new Set([
    "Multipart: Boundary not found",
    "Malformed content type",
    "Malformed part header",
    "Unexpected end of form",
    "Unexpected end of file",
]);

export function parseMultipart(parser) {
    return (req, res, next) => {
        parser(req, res, (error) => {
            if (error && !error.code && invalidMultipart.has(error.message)) {
                return next(new AppError(400, "Invalid multipart upload", "INVALID_MULTIPART"));
            }
            next(error);
        });
    };
}
