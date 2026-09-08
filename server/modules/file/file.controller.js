import Contribution from "../contribution/contribution.model.js";
import { RenameOneDriveFile } from "../../services/UploadFile.js";
import { requireFile, presentFile, visibleFiles } from "../../services/authorization.js";
import { removeFile } from "../../services/resourceRemoval.js";
import AppError from "../../utils/appError.js";

export async function verifyFile(req, res) {
    const { file, code } = await requireFile(
        req,
        req.params.id,
        req.body.courseCode,
        "canModerate",
    );
    file.isVerified = true;
    await file.save();
    const contributions = await Contribution.find({ files: file._id }).populate("files");
    for (const contribution of contributions) {
        contribution.approved =
            contribution.files.length > 0 && contribution.files.every((f) => f.isVerified);
        await contribution.save();
    }
    res.json({ message: "File verified successfully", file: await presentFile(req, file, code) });
}
export async function unverifyFile(req, res) {
    const { file } = await requireFile(req, req.params.id, req.body.courseCode, "canManage");
    await removeFile(file);
    res.json({ message: "File deleted successfully" });
}
export async function getAllFiles(req, res) {
    res.json(await visibleFiles(req));
}
export async function getFileLink(req, res) {
    const { file } = await requireFile(req, req.params.id, req.query.courseCode);
    res.json({ file: await presentFile(req, file, req.query.courseCode) });
}
export async function downloadFiles(req, res) {
    const { file } = await requireFile(req, req.body.fileId, req.body.courseCode);
    res.json({ downloadLink: `/api/files/content/${file._id}?download=1` });
}
export async function renameFile(req, res) {
    const { file, code } = await requireFile(req, req.params.id, req.body.courseCode, "canManage");
    const newName = typeof req.body.newName === "string" ? req.body.newName.trim() : "";
    if (!newName || newName.length > 200 || /[\\/:*?"<>|]/.test(newName))
        throw new AppError(400, "A valid file name is required");
    const dot = file.name.lastIndexOf("."),
        tilde = file.name.lastIndexOf("~");
    const suffix = tilde !== -1 ? file.name.slice(tilde) : dot !== -1 ? file.name.slice(dot) : "";
    const name = newName + suffix;
    await RenameOneDriveFile(file.fileId, name);
    file.name = name;
    await file.save();
    res.json({ message: "File renamed successfully", file: await presentFile(req, file, code) });
}
