import mongoose from "../../config/mongoose.js";
import bcrypt from "bcrypt";

const AdminSchema = new mongoose.Schema(
    {
        userId: { type: String, required: true, unique: true, trim: true },
        password: { type: String, required: true },
    },
    { timestamps: true },
);

AdminSchema.pre("save", async function () {
    const admin = this;
    if (!admin.isModified("password")) return;
    const hashed = await bcrypt.hash(admin.password, 10);
    admin.password = hashed;
});

AdminSchema.methods.comparePassword = async function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

const Admin = mongoose.model("Admin", AdminSchema);
export default Admin;
