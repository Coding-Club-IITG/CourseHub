import { model, Schema } from "mongoose";
import Joi from "joi";
import AppError from "../../utils/appError.js";
import axios from "axios";
import { getRandomColor } from "../../utils/generateRandomColor.js";
import { normalizeCourseCode } from "../../utils/course.js";

const userSchema = Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    rollNumber: { type: Number, required: true, unique: true },
    // branch: { type: String, required: true },
    semester: { type: Number, reqiured: true },
    degree: { type: String, required: true },
    courses: { type: Array, default: [], required: true },
    readOnly: { type: Array, default: [] },
    isBR: { type: Boolean },
    previousCourses: { type: Array, default: [] },
    department: { type: String, required: true }, //dup
    favourites: [
        {
            name: { type: String },
            id: { type: String },
            path: { type: String },
            code: { type: String },
        },
    ],
    deviceToken: { type: String, default: "" },
});

userSchema.pre("save", function (next) {
    const user = this;
    if (
        user.isModified("courses") ||
        user.isModified("previousCourses") ||
        user.isModified("readOnly")
    ) {
        const courseCodes = new Set([
            ...user.courses.map((c) => normalizeCourseCode(c.code)),
            ...(user.previousCourses?.flatMap((sem) =>
                sem.courses.map((c) => normalizeCourseCode(c.code)),
            ) || []),
        ]);
        user.readOnly = user.readOnly.filter((c) => !courseCodes.has(normalizeCourseCode(c.code)));
    }
    next();
});

const User = model("User", userSchema);
export default User;

export const validateUser = function (obj) {
    const joiSchema = Joi.object({
        name: Joi.string().min(4).required(),
        email: Joi.string().email().required(),
        rollNumber: Joi.number().required(),
        // branch: Joi.string().required(),
        semester: Joi.number().required(),
        degree: Joi.string().required(),
        courses: Joi.array().required(),
        isBR: Joi.boolean().optional(),
        previousCourses: Joi.array()
            .items(
                Joi.object({
                    semester: Joi.number().required(),
                    year: Joi.number().required(),
                    courses: Joi.array().required(),
                }),
            )
            .required(),
        department: Joi.string().required(),
        readOnly: Joi.array().required(),
    });
    return joiSchema.validate(obj);
};
export const updateUserData = async (userId, userData) => {
    const schema = Joi.object({
        newUserName: Joi.string().trim().min(1).max(120),
        newUserSem: Joi.number().integer().min(1).max(12),
    })
        .min(1)
        .required();
    const { value, error } = schema.validate(userData, { abortEarly: false });
    if (error)
        throw new AppError(
            400,
            "Check the profile fields",
            "VALIDATION_FAILED",
            Object.fromEntries(
                error.details.map((detail) => [detail.path.join("."), detail.message]),
            ),
        );
    const updates = {};
    if (value.newUserName !== undefined) updates.name = value.newUserName;
    if (value.newUserSem !== undefined) updates.semester = value.newUserSem;
    const saved = await User.findByIdAndUpdate(
        userId,
        { $set: updates },
        { new: true, runValidators: true },
    );
    if (!saved) throw new AppError(404, "Profile not found");
    return { name: saved.name, semester: saved.semester };
};

export const getUserFromToken = (accessToken) =>
    axios.get("https://graph.microsoft.com/v1.0/me", {
        headers: { Authorization: `Bearer ${accessToken}` },
        timeout: 30000,
    });

export const findUserWithEmail = async function (email) {
    const normalizedEmail = email?.toString().trim().toLowerCase();
    if (!normalizedEmail) return false;
    const user = await User.findOne({ email: normalizedEmail }).collation({
        locale: "en",
        strength: 2,
    });
    if (!user) return false;
    return user;
};

export const addToFavourites = async (userid, name, id, path, code) => {
    const UserData = await User.findById(userid);
    const favs = UserData.favourites;
    const found = favs.find((item) => item.id === id);
    if (found) return UserData;
    UserData.favourites.push({
        name: name,
        id: id,
        path: path,
        code: code,
    });
    const updatedUser = await UserData.save();
    return updatedUser;
};
export const AddReadOnlyCourse = async (userid, code, name) => {
    const UserData = await User.findById(userid);
    const normalizedCode = normalizeCourseCode(code);

    if (UserData.readOnly.some((c) => normalizeCourseCode(c.code) === normalizedCode))
        return UserData;

    // Check if in courses
    const inCourses = UserData.courses.some(
        (course) => normalizeCourseCode(course.code) === normalizedCode,
    );
    if (inCourses) return UserData;

    // Check if in previousCourses
    const inPrevious = UserData.previousCourses?.some((sem) =>
        sem.courses.some((course) => normalizeCourseCode(course.code) === normalizedCode),
    );
    if (inPrevious) return UserData;

    const color = getRandomColor();
    UserData.readOnly.push({
        code: normalizedCode,
        name,
        color,
    });
    const updatedUser = await UserData.save();
    return updatedUser;
};

export const RemoveReadOnly = async (userid, code) => {
    const UserData = await User.findById(userid);
    const normalizedCode = normalizeCourseCode(code);
    let filtered = UserData.readOnly.filter(
        (course) => normalizeCourseCode(course.code) !== normalizedCode,
    );
    UserData.readOnly = filtered;
    const updatedUser = await UserData.save();
    return updatedUser;
};

export const removeFromFavourites = async (userid, fileid) => {
    const resp = await User.findOneAndUpdate(
        { _id: userid },
        { $pull: { favourites: { _id: fileid } } },
        { new: true },
    );
    return resp;
};
