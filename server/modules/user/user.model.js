import { model, Schema } from "mongoose";
import Joi from "joi";
import axios from "axios";
import jwt from "jsonwebtoken";
import config from "../../config/default.js";
import { logger } from "@azure/identity";
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
    readOnly: {type: Array, default: []},
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
                sem.courses.map((c) => normalizeCourseCode(c.code))
            ) || []),
        ]);
        user.readOnly = user.readOnly.filter((c) => !courseCodes.has(normalizeCourseCode(c.code)));
    }
    next();
});

userSchema.methods.generateJWT = function () {
    var user = this;
    var token = jwt.sign(
        { user: user._id, isBR: user.isBR },
        config.jwtSecret,
        {
            expiresIn: "24d",
        }
    );
    return token;
};

userSchema.statics.findByJWT = async function (token) {
    try {
        var user = this;
        var decoded = jwt.verify(token, config.jwtSecret);
        const id = decoded.user;
        const fetchedUser = await user.findOne({ _id: id });
        if (!fetchedUser) return false;
        return fetchedUser;
    } catch (error) {
        return false;
    }
};

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
        previousCourses: Joi.array().items(
            Joi.object({
                semester: Joi.number().required(),
                year: Joi.number().required(),
                courses: Joi.array().required()
            })
        ).required(),
        department: Joi.string().required(),
        readOnly: Joi.array().required(),
    });
    return joiSchema.validate(obj);
};
export const updateUserData = async (userId, userData) => {
    User.findOne({ _id: userId }, async (err, doc) => {
        if (err) {
            logger.info("ERROR IN UPDATING USER");
        }
        if (userData.newUserData.newUserName) {
            doc.name = userData.newUserData.newUserName;
            await doc.save();
        } else if (userData.newUserData.newUserSem) {
            doc.semester = userData.newUserData.newUserSem;
            await doc.save();
        }
    });
};

export const getUserFromToken = async function (access_token) {
    try {
        var config = {
            method: "get",
            url: "https://graph.microsoft.com/v1.0/me",
            headers: {
                Authorization: `Bearer ${access_token}`,
            },
        };
        const response = await axios.get(config.url, {
            headers: config.headers,
        });

        return response;
    } catch (error) {
        return false;
    }
};

// export const findUserWithRollNumber = async function (rollNumber) {
// 	const user = await User.findOne({ rollNumber: rollNumber });
// 	if (!user) return false;
// 	return user;
// };

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
export const AddNewCourse = async (userid, code, name) => {
    const UserData = await User.findById(userid);
    const normalizedCode = normalizeCourseCode(code);

    if (UserData.courses.some((c) => normalizeCourseCode(c.code) === normalizedCode))
        return UserData;

    const color = getRandomColor();

    // Remove from readOnly if present
    UserData.readOnly = UserData.readOnly.filter(
        (course) => normalizeCourseCode(course.code) !== normalizedCode
    );

    UserData.courses.push({
        code: normalizedCode,
        name,
        color,
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
        (course) => normalizeCourseCode(course.code) === normalizedCode
    );
    if (inCourses) return UserData;

    // Check if in previousCourses
    const inPrevious = UserData.previousCourses?.some((sem) =>
        sem.courses.some((course) => normalizeCourseCode(course.code) === normalizedCode)
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

export const RemoveCourse = async (userid, code) => {
    const UserData = await User.findById(userid);
    const normalizedCode = normalizeCourseCode(code);
    let filtered = UserData.courses.filter(
        (course) => normalizeCourseCode(course.code) !== normalizedCode
    );
    UserData.courses = filtered;
    const updatedUser = await UserData.save();
    return updatedUser;
};

export const RemoveReadOnly = async (userid, code) => {
    const UserData = await User.findById(userid);
    const normalizedCode = normalizeCourseCode(code);
    let filtered = UserData.readOnly.filter(
        (course) => normalizeCourseCode(course.code) !== normalizedCode
    );
    UserData.readOnly = filtered;
    const updatedUser = await UserData.save();
    return updatedUser;
};

export const removeFromFavourites = async (userid, fileid) => {
    const resp = await User.findOneAndUpdate(
        { _id: userid },
        { $pull: { favourites: { _id: fileid } } },
        { new: true }
    );
    return resp;
};
