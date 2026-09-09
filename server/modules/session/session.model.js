import { model, Schema } from "../../config/mongoose.js";

const sessionSchema = new Schema(
    {
        _id: String,
        actorId: { type: Schema.Types.ObjectId, required: true },
        role: { type: String, enum: ["student", "admin"], required: true },
        csrfToken: { type: String, required: true },
        expiresAt: { type: Date, required: true, expires: 0 },
        revokedAt: { type: Date, default: null },
    },
    { timestamps: true },
);

export default model("Session", sessionSchema);
