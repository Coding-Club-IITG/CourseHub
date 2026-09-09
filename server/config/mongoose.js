import mongoose from "mongoose";

// An unknown filter must fail instead of being stripped into a broader query
mongoose.set("strictQuery", "throw");
mongoose.set("strict", true);

export { Schema, model, Types } from "mongoose";
export default mongoose;
