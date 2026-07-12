import { FileModel, FolderModel } from "../course/course.model.js";
import { DeleteFile, RenameOneDriveFile } from "../../services/UploadFile.js";
import logger from "../../utils/logger.js";
import { isValidObjectId } from "mongoose";

export const verifyFile = async (req, res) => {
    try {
        const { id } = req.params;
        
        if (!id || !isValidObjectId(id)) {
            return res.status(400).json({ message: "Invalid file ID" });
        }
        
        const file = await FileModel.findById(id);
        if (!file) return res.status(404).json({ message: "File not found" });

        file.isVerified = true;
        await file.save();

        res.status(200).json({ message: "File verified successfully", file });
    } catch (err) {
        logger.error(err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
};

export const unverifyFile = async (req, res) => {
    try {
        const { id } = req.params;
        const { folderId, oneDriveId } = req.body;
        
        if (!folderId || !oneDriveId) {
            return res.status(400).json({ message: "folderId and oneDriveId required" });
        }
        
        await FolderModel.findByIdAndUpdate(folderId, { $pull: { children: id } });
        const file = await FileModel.findByIdAndDelete(id);
        if (!file) return res.status(404).json({ message: "File not found" });

        await DeleteFile(oneDriveId);

        res.status(200).json({ message: "File deleted (unverified) successfully" });
    } catch (err) {
        logger.error(err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
};

export const deleteFile = async (file) => {
    await FileModel.findByIdAndDelete(file._id);
    await DeleteFile(file.fileId);
}

export const getAllFiles = async (req, res) => {
    try {
        let files;

        if (req.user.isBR === true) {
            files = await FileModel.find().sort({ uploadedAt: -1 });
        } else {
            // Regular users get only verified files
            files = await FileModel.find({ isVerified: true }).sort({ uploadedAt: -1 });
        }

        res.status(200).json(files);
    } catch (err) {
        logger.error({ err, userId: req.user?._id }, "Error fetching files");
        res.status(500).json({ message: "Server error", error: err.message });
    }
};


export const getFileLink = async (req, res) => {
    try {
        const fileId = req.params.id;
        if (!fileId || !isValidObjectId(fileId)) {
            return res.status(400).json({ message: "Invalid file ID" });
        }

        const file = await FileModel.findById(fileId).select("webUrl downloadUrl name");
        
        if (!file) {
            return res.status(404).json({ message: "File not found" });
        }

        return res.status(200).json({ file });
        
    } catch (error) {
        logger.error(error, "Error fetching file link");
        return res.status(500).json({ message: "Internal server error" });
    }
};

export const renameFile = async (req, res) => {
    try {
        const { id } = req.params;
        const { newName } = req.body;

        if (!id || !isValidObjectId(id)) {
            return res.status(400).json({ message: "Invalid file ID" });
        }
        
        const trimmedNewName = newName?.trim();
        if (!trimmedNewName) {
            return res.status(400).json({ message: "New name is required and cannot be empty" });
        }

        if (trimmedNewName.length > 200) {
            return res.status(400).json({ message: "New name is too long (maximum 200 characters)" });
        }

        // Validate illegal OneDrive characters: \ / : * ? " < > |
        const illegalChars = /[\\/:*?"<>|]/;
        if (illegalChars.test(trimmedNewName)) {
            return res.status(400).json({ 
                message: "New name contains forbidden characters (\\, /, :, *, ?, \", <, >, |)" 
            });
        }

        const file = await FileModel.findById(id);
        if (!file) {
            return res.status(404).json({ message: "File not found" });
        }

        const originalName = file.name;
        const lastTildeIndex = originalName.lastIndexOf("~");
        const dotIndex = originalName.lastIndexOf(".");
        const ext = dotIndex !== -1 ? originalName.slice(dotIndex) : "";

        let contributor = "";
        if (lastTildeIndex !== -1) {
            contributor = originalName.slice(lastTildeIndex, dotIndex !== -1 ? dotIndex : undefined);
        }

        const finalNewName = `${trimmedNewName}${contributor}${ext}`;

        // Rename on OneDrive using the file's fileId
        await RenameOneDriveFile(file.fileId, finalNewName);

        // Update name in MongoDB
        file.name = finalNewName;
        await file.save();

        res.status(200).json({ message: "File renamed successfully", file });
    } catch (err) {
        logger.error(err, `Error renaming file ${req.params.id}`);
        res.status(500).json({ message: "Server error", error: err.message });
    }
};