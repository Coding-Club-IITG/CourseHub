import { Schema } from "../../config/mongoose.js";
import { isCourseCode } from "@coursehub/domain";

const integer = { validator: Number.isSafeInteger, message: "Use a whole number" };
const courseReference = new Schema(
    {
        // Preserve IDs already present in older references without generating new ones
        _id: { type: Schema.Types.ObjectId, auto: false },
        code: {
            type: String,
            required: true,
            validate: {
                validator: isCourseCode,
                message: "A valid course code is required",
            },
        },
        name: String,
        color: String,
    },
    { _id: false, strict: "throw" },
);

const semesterReference = new Schema(
    {
        _id: { type: Schema.Types.ObjectId, auto: false },
        semester: { type: Number, min: 1, validate: integer },
        year: { type: Number, min: 2000, validate: integer },
        session: { type: String, enum: ["Jan-May", "July-Nov"] },
        courses: { type: [courseReference], required: true, default: undefined },
    },
    { _id: false, strict: "throw" },
);

export { courseReference, semesterReference };
