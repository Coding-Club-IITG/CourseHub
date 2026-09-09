import "../support/environment.js";
import fs from "node:fs";
import path from "node:path";
import { once } from "node:events";
import express from "express";
import multer from "multer";
import { multipartLimits, parseMultipart } from "../../middleware/multipart.js";
import { requestContext, requestErrorHandler } from "../../middleware/requestErrors.js";

// A child process contains any parser crash or event-loop stall in hostile input tests.
if (!process.send) throw new Error("Start this fixture through the multipart test runner");
const directory = process.argv[2];
const activeWrites = new Set();
const createWriteStream = fs.createWriteStream;
fs.createWriteStream = (...args) => {
    const stream = createWriteStream(...args);
    activeWrites.add(stream);
    stream.once("close", () => activeWrites.delete(stream));
    return stream;
};

const limits = { ...multipartLimits, fileSize: 8, files: 2, fields: 4, fieldSize: 64 };
const upload = multer({ dest: directory, limits });
const interruptedUpload = multer({
    dest: directory,
    limits: { ...limits, fileSize: 1024 * 1024 },
});
const failingUpload = multer({
    storage: multer.diskStorage({
        destination(req, file, callback) {
            callback(Object.assign(new Error("private-storage-path"), { code: "EACCES" }));
        },
    }),
    limits,
});
let completed = 0;
let errors = 0;
const app = express();
app.use(requestContext);
const finish = async (req, res) => {
    completed++;
    const files = req.files || (req.file ? [req.file] : []);
    const result = [];
    for (const file of files) {
        result.push({
            originalname: file.originalname,
            filename: file.filename,
            size: file.size,
            content: await fs.promises.readFile(file.path, "utf8"),
            contained: path.dirname(file.path) === directory,
        });
        await fs.promises.unlink(file.path);
    }
    res.json({ files: result, fields: req.body });
};
app.post("/multiple", parseMultipart(upload.array("file")), finish);
app.post("/single", parseMultipart(upload.single("file")), finish);
app.post("/interrupt", parseMultipart(interruptedUpload.array("file")), finish);
app.post("/storage-failure", parseMultipart(failingUpload.single("file")), finish);
app.get("/health", async (req, res) => {
    res.json({
        completed,
        errors,
        activeWrites: activeWrites.size,
        files: await fs.promises.readdir(directory),
    });
});
app.use((error, req, res, next) => {
    errors++;
    next(error);
});
app.use(requestErrorHandler);
const listener = app.listen(0, "127.0.0.1");
await once(listener, "listening");
process.send({ origin: `http://127.0.0.1:${listener.address().port}` });
