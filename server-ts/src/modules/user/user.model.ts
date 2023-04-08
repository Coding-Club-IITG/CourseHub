import mongoose, { model, Schema } from "mongoose";
import axios from "axios";

interface UserAtts {
  name: string;
  email: string;
  rollNumber: number;
  semester: Number;
  degree: string;
  courses: [];
  department: string;
  favourites?: [{ name: string; id: string; path: string; code: string }];
}

interface UserDoc extends mongoose.Document, UserAtts {}

const userSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  rollNumber: { type: Number, required: true, unique: true },
  semester: { type: Number, reqiured: true },
  degree: { type: String, required: true },
  courses: { type: Array, default: [], required: true },
  department: { type: String, required: true },
  favourites: [
    {
      name: { type: String },
      id: { type: String },
      path: { type: String },
      code: { type: String },
    },
  ],
});

export const User = model<UserDoc>("User", userSchema);
