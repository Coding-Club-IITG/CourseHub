import { model, Schema } from "../../config/mongoose.js";
import { folderChildTypes } from "@coursehub/domain";

const FolderSchema = Schema({
    deletingOperation: String,
    courses: [{ type: String, required: true }],
    name: { type: String, required: true },
    childType: { type: String, enum: folderChildTypes, required: true },
    children: [{ type: Schema.Types.ObjectId, refPath: "childType" }],
    totalFileCount: { type: Number, min: 0, validate: Number.isSafeInteger, default: 0 },
});

export const FolderModel = model("Folder", FolderSchema);

const FileSchema = Schema({
    deletingOperation: String,
    uploadOperation: String,
    resourceState: { type: String, enum: ["uploading", "ready"], default: "ready" },
    // Missing legacy byte counts remain unknown until a reviewed migration supplies evidence.
    sizeBytes: {
        type: Number,
        min: 0,
        max: Number.MAX_SAFE_INTEGER,
        validate: Number.isSafeInteger,
    },
    contributorName: String,
    name: { type: String, required: true },
    fileId: { type: String, required: true },
    size: {
        type: String,
        required: function () {
            return this.sizeBytes == null;
        },
    },
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
