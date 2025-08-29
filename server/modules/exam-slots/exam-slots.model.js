import mongoose from 'mongoose';
const { Schema, model } = mongoose;

const courseSlotSchema = {
    course:{
    type: String,
    required: true,
    },
  branch: {
    type: String,
    required: true,
  },
  semester: {
    type: Number,
    required: true,
  },
  A: {
    type: String,
    required: true,
  },
  A1: {
    type: String,
    required: true,
  },
  B: {
    type: String,
    required: true,
  },
  B1: {
    type: String,
    required: true,
  },
  C: {
    type: String,
    required: true,
  },
  C1: {
    type: String,
    required: true,
  },
  D: {
    type: String,
    required: true,
  },
  D1: {
    type: String,
    required: true,
  },
  E: {
    type: String,
    required: true,
  },
  E1: {
    type: String,
    required: true,
  },
  F: {
    type: String,
    required: true,
  },
  F1: {
    type: String,
    required: true,
  },
  G: {
    type: String,
    required: true,
  },
  G1: {
    type: String,
    required: true,
  },
};

const courseSlotModel = new Schema(courseSlotSchema, { timestamps: true });

const ExamSlotModel = model('ExamSlot', courseSlotModel);
export default ExamSlotModel;
