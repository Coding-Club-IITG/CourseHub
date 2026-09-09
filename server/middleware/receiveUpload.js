import fs from "node:fs";
import multer from "multer";
import { multipartLimits, parseMultipart } from "./multipart.js";
import { uploadLimits, uploadDirectory } from "../config/storage.js";
import { reserveUpload, receiveComplete, receiveFailed } from "../services/uploads.js";

export const upload = multer({
    storage: multer.diskStorage({
        destination(req, file, callback) {
            fs.mkdir(uploadDirectory(), { recursive: true, mode: 0o700 }, (error) =>
                callback(error, uploadDirectory()),
            );
        },
        filename: (req, file, callback) => callback(null, req.uploadReservation.temporaryName),
    }),
    defParamCharset: "utf8",
    limits: {
        ...multipartLimits,
        fileSize: uploadLimits.fileBytes,
        files: 1,
        fields: 4,
        fieldSize: 16384,
        parts: 6,
    },
});

export async function receiveUpload(req, res, next) {
    let reservation;
    try {
        reservation = await reserveUpload(req);
        const response = () => ({
            operationId: reservation.operation._id,
            fileId: reservation.entry.id,
            statusUrl: `/api/operations/${reservation.operation._id}`,
        });
        if (reservation.existing) {
            req.resume();
            return res.status(202).json(response());
        }
        req.uploadReservation = reservation;
        parseMultipart(upload.single("file"))(req, res, async (error) => {
            try {
                if (error) throw error;
                await receiveComplete(reservation, req.file);
                res.status(202).json(response());
            } catch (failure) {
                try {
                    await receiveFailed(reservation, failure);
                } catch (cleanupError) {
                    return next(cleanupError);
                }
                next(failure);
            }
        });
    } catch (error) {
        if (reservation && !reservation.existing) {
            try {
                await receiveFailed(reservation, error);
            } catch (cleanupError) {
                return next(cleanupError);
            }
        }
        next(error);
    }
}
