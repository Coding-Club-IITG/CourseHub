import mongoose from "mongoose";
import bcrypt from "bcrypt";
import Joi from "joi";

export const adminValidationSchema = Joi.object({
    username: Joi.string().min(3).required(),
    password: Joi.string().min(6).required(),
    email: Joi.string().email().required(),
});

export const generateCodeValidaitionSchema = Joi.object({
    username: Joi.string().min(3).required(),
    password: Joi.string().min(6).required(),
});

export const loginValidationSchema = Joi.object({
    username: Joi.string().min(3).required(),
    otp: Joi.number().required(),
});

export const makeCourseValidationSchema = Joi.object({
    id: Joi.string().required(),
    code: Joi.string().required(),
});

export const approveContributionSchema = Joi.object({
    contributionId: Joi.string().required(),
    courseCode: Joi.string().required(),
    toFolderId: Joi.string().required(),
});

const AdminSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    email: { type: String, required: true, unique: true },
});

AdminSchema.pre("save", async function (next) {
    const user = this;
    if (!user.isModified("password")) {
        return next();
    }
    const hashed = await bcrypt.hash(user.password, 10);

    user.password = hashed;
    return next();
});

const Admin = mongoose.model("Admin", AdminSchema);

export default Admin;
