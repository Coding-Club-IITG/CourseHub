import { model, Schema } from "mongoose";

const FolderSchema = Schema({
    courses: [{ type: String, required: true }],
    name: { type: String, required: true },
    childType: { type: String, enum: ["File", "Folder"], required: true },
    children: [{ type: Schema.Types.ObjectId, refPath: "childType" }],
});

export const FolderModel = model("Folder", FolderSchema);

const FileSchema = Schema({
    name: { type: String, required: true },
    fileId: { type: String, required: true },
    size: { type: String, required: true },
    thumbnail: { type: String },
    webUrl: { type: String, required: true },
    downloadUrl: { type: String, required: true },
    isVerified: { type: Boolean, default: false, required: true },
});

export const FileModel = model("File", FileSchema);

const CourseSchema = Schema(
    {
        name: { type: String, required: true },
        code: { type: String, required: true, unique: true },
        children: { type: [{ type: Schema.Types.ObjectId, ref: "Folder" }], default: [] },
        books: [{ type: String }],
    },
    { timestamps: true }
);

const CourseModel = model("Course", CourseSchema);
export default CourseModel;