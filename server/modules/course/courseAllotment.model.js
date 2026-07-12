import mongoose from "mongoose";

const CourseAllotmentSchema = new mongoose.Schema(
    {
        rollNumber: {
            type: Number,
            required: true,
            index: true,
        },
        courses: {
            type: [String],
            required: true,
        },
        session: {
            type: String,
            required: true,
        },
        year: {
            type: Number,
            required: true,
        },
    },
    { timestamps: true }
);

CourseAllotmentSchema.index({ rollNumber: 1, session: 1, year: 1 }, { unique: true });

const CourseAllotment = mongoose.model("CourseAllotment", CourseAllotmentSchema);

export default CourseAllotment;
