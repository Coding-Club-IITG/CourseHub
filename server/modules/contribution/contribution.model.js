import { model, Schema } from "mongoose";

const ContributionSchema = Schema(
    {
        operationId: String,
        deletingOperation: String,
        contributionId: { type: String },
        uploadedBy: { type: String },
        courseCode: { type: String },
        parentFolder: { type: Schema.Types.ObjectId, ref: "Folder" },
        files: [{ type: Schema.Types.ObjectId, ref: "File" }],
        approved: { type: Boolean, default: false },
        description: { type: String },
    },
    { timestamps: true },
);

const Contribution = model("Contribution", ContributionSchema);

export default Contribution;
