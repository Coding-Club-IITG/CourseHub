import mongoose, { model, mongo, Schema } from "mongoose";
import User from "../user/user.model.js";

const ContributionSchema = Schema(
    {
        contributionId: { type: String },
        uploadedBy: { type: String },
        courseCode: { type: String },
        parentFolder: { type: Schema.Types.ObjectId, ref: "Folder" },
        files: [{ type: Schema.Types.ObjectId, ref: "File" }],
        approved: { type: Boolean, default: false },
        description: { type: String },
    },
    { timestamps: true }
);

ContributionSchema.pre("save", async function (next) {
    try {
        if (this.uploadedBy) {
            const user = await User.findById(this.uploadedBy);
            if (user && user.isBR) {
                this.approved = true;
            }
        }
        next();
    } catch (err) {
        next(err);
    }
});

const Contribution = model("Contribution", ContributionSchema);

export default Contribution;
