import { model, Schema } from "../../config/mongoose.js";

// A retired code remains reserved to its resource ID, including after deletion
const identity = new Schema(
    {
        _id: String,
        courseId: { type: Schema.Types.ObjectId, required: true },
        retired: { type: Boolean, default: false },
    },
    { timestamps: true },
);
identity.index({ courseId: 1 });
export default model("CourseIdentity", identity);
