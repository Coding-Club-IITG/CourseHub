import { model, Schema } from "../../config/mongoose.js";
const BRSchema = Schema({
    email: { type: String, required: true, unique: true },
});

const BR = model("BR", BRSchema);
export default BR;
