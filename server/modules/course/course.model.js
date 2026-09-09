import { model, Schema } from "mongoose";

const FolderSchema = Schema({
    deletingOperation: String,
    courses: [{ type: String, required: true }],
    name: { type: String, required: true },
    childType: { type: String, enum: ["File", "Folder"], required: true },
    children: [{ type: Schema.Types.ObjectId, refPath: "childType" }],
    totalFileCount: { type: Number, default: 0 },
});

export const FolderModel = model("Folder", FolderSchema);

const FileSchema = Schema({
    deletingOperation: String,
    uploadOperation: String,
    resourceState: { type: String, enum: ["uploading", "ready"], default: "ready" },
    sizeBytes: { type: Number, min: 0 },
    contributorName: String,
    name: { type: String, required: true },
    fileId: { type: String, required: true },
    size: { type: String, required: true },
    thumbnail: {
        url: { type: String },
        fileId: { type: String },
        path: { type: String },
    },
    webUrl: String,
    downloadUrl: String,
    isVerified: { type: Boolean, default: false, required: true },
});

export const FileModel = model("File", FileSchema);

const CourseSchema = Schema(
    {
        deletingOperation: String,
        changingOperation: String,
        aliases: { type: [String], default: [] },
        name: { type: String, required: true },
        code: { type: String, required: true, unique: true },
        children: { type: [{ type: Schema.Types.ObjectId, ref: "Folder" }], default: [] },
        books: [{ type: String }],
    },
    { timestamps: true },
);

const CourseModel = model("Course", CourseSchema);
export default CourseModel;
