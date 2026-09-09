import { model, Schema } from "mongoose";

// Cache snapshots are published atomically only after the whole response validates
const snapshot = new Schema({
    _id: String,
    year: Number,
    session: String,
    generation: { type: String, required: true },
    fetchedAt: { type: Date, required: true },
    allotments: { type: Schema.Types.Mixed, required: true },
});
export default model("AcademicSnapshot", snapshot);
