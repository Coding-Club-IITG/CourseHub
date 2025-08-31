import mongoose from 'mongoose';
const { Schema, model } = mongoose;

const courseSlotSchema = {
  course: {
    type: String,
    required: true, // still required (probably needed for uniqueness)
  },
  branch: {
    type: String,
    required: true, // still required
  },
  semester: {
    type: Number,
    required: true, // still required
  },

  // Regular slots
  A: { type: String, required: false },
  A1: { type: String, required: false },
  B: { type: String, required: false },
  B1: { type: String, required: false },
  C: { type: String, required: false },
  C1: { type: String, required: false },
  D: { type: String, required: false },
  D1: { type: String, required: false },
  E: { type: String, required: false },
  E1: { type: String, required: false },
  F: { type: String, required: false },
  F1: { type: String, required: false },
  G: { type: String, required: false },
  G1: { type: String, required: false },

  // ML slots
  ML1: { type: String, required: false },
  ML2: { type: String, required: false },
  ML3: { type: String, required: false },
  ML4: { type: String, required: false },
  ML5: { type: String, required: false },

  // AL slots
  AL1: { type: String, required: false },
  AL2: { type: String, required: false },
  AL3: { type: String, required: false },
  AL4: { type: String, required: false },
  AL5: { type: String, required: false },
};

const courseSlotModel = new Schema(courseSlotSchema, { timestamps: true });

const ExamSlotModel = model('ExamSlot', courseSlotModel);
export default ExamSlotModel;
