import mongoose from "mongoose";
import bcrypt from "bcrypt";

const AdminSchema = new mongoose.Schema(
    {
        userId: { type: String, required: true, unique: true, trim: true },
        password: { type: String, required: true },
    },
    { timestamps: true },
);

AdminSchema.pre("save", async function (next) {
    const admin = this;
    if (!admin.isModified("password")) return next();
    const hashed = await bcrypt.hash(admin.password, 10);
    admin.password = hashed;
    return next();
});

AdminSchema.methods.comparePassword = async function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

const Admin = mongoose.model("Admin", AdminSchema);
export default Admin;
