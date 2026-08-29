import AppError from "../../utils/appError.js";
import logger from "../../utils/logger.js";
import User, { RemoveCourse } from "./user.model.js";
import { addToFavourites, removeFromFavourites, AddNewCourse , AddReadOnlyCourse,  RemoveReadOnly } from "./user.model.js";
import { updateUserData } from "./user.model.js";
import UserUpdate from "./userUpdate.model.js";
import BR from "../br/br.model.js";
import { normalizeCourseCode } from "../../utils/course.js";

const normalizeEmail = (email) => email?.toString().trim().toLowerCase();

let currentDay = new Date().toISOString().split('T')[0];
let activeUsersToday = new Set();

export const getUser = async (req, res, next) => {
    const user = req.user;

    const today = new Date().toISOString().split('T')[0];
    if (today !== currentDay) {
        activeUsersToday.clear();
        currentDay = today;
    }
    
    if (user && user.email && !activeUsersToday.has(user.email)) {
        activeUsersToday.add(user.email);
        logger.metric?.("daily_active_user", {
            value: 1,
            dimensions: {
                userEmail: user.email,
                department: user.department,
                semester: user.semester
            }
        });
    }

    const userUpdated = await UserUpdate.findOne({ rollNumber: user.rollNumber });
    if (!userUpdated) {
        res.cookie("token", "loggedout", {
            maxAge: 0,
            sameSite: "lax",
            secure: false,
            expires: new Date(Date.now()),
            httpOnly: true,
        });
        return res.status(401).json({ error: "User update required, please log in again" });
    }

    const normalizedEmail = normalizeEmail(user.email);
    const brDoc = normalizedEmail
        ? await BR.findOne({ email: normalizedEmail }).collation({
              locale: "en",
              strength: 2,
          })
        : null;

    if (brDoc && !user.isBR) {
        user.isBR = true;
        await user.save();

        res.cookie("token", "loggedout", {
            maxAge: 0,
            sameSite: "lax",
            secure: false,
            expires: new Date(Date.now()),
            httpOnly: true,
        });

        return res
            .status(401)
            .json({ error: "BR access updated. Please log in again.", forceLogout: true });
    }

    const isBranchRep = !!user.isBR || !!brDoc;

    const previousCourses = Array.isArray(user.previousCourses) ? user.previousCourses : [];
    const needsCourseSync = isBranchRep && previousCourses.length === 0;

    const responseUser = {
        _id: user._id,
        name: user.name,
        email: user.email,
        rollNumber: user.rollNumber,
        semester: user.semester,
        degree: user.degree,
        courses: user.courses,
        department: user.department,
        favourites: user.favourites,
        deviceToken: user.deviceToken,
        isBR: isBranchRep,
        readOnly: user.readOnly,
        needsCourseSync,
    };

    if (isBranchRep) {
        responseUser.previousCourses = previousCourses;
    }

    return res.status(200).json(responseUser);
};

export const updateUserController = async (req, res) => {
    const data = req.body;
    updateUserData(req.user._id, data);
};
export const addToFavouriteController = async (req, res, next) => {
    const data = req.body;
    if (!data.id || !data.name || !data.path || !data.code) return res.sendStatus(400);
    //validate
    const updatedUser = await addToFavourites(
        req.user._id,
        data.name,
        data.id,
        data.path,
        normalizeCourseCode(data.code)
    );
    return res.status(200).json(updatedUser);
};
export const addNewCourse = async (req, res, next) => {
    const data = req.body;
    if (!data.code || !data.name) return res.sendStatus(400);

    const updatedUser = await AddNewCourse(req.user._id, normalizeCourseCode(data.code), data.name);
    return res.status(200).json(updatedUser);
};

export const addReadOnly = async (req, res, next) => {
    const data = req.body;
    if (!data.code || !data.name) return res.sendStatus(400);

    const updatedUser = await AddReadOnlyCourse(
        req.user._id,
        normalizeCourseCode(data.code),
        data.name
    );
    return res.status(200).json(updatedUser);
};

export const deleteCourse = async (req, res, next) => {
    const { code } = req.params;
    if (!code) return res.sendStatus(400);
    const updatedUser = await RemoveCourse(req.user._id, normalizeCourseCode(code));

    return res.status(200).json(updatedUser);
};

export const deleteReadOnly = async (req, res, next) => {
    const { code } = req.params;
    if (!code) return res.sendStatus(400);
    const updatedUser = await RemoveReadOnly(req.user._id, normalizeCourseCode(code));

    return res.status(200).json(updatedUser);
};

export const removeFromFavouritesController = async (req, res, next) => {
    const { id } = req.params;
    if (!id) return res.sendStatus(400);
    //validate
    const updatedUser = await removeFromFavourites(req.user._id, id);
    return res.status(200).json(updatedUser);
};
export const updateDeviceToken = async (req, res, next) => {
    const user = req.user;
    const { deviceToken } = req.body;
    if (!deviceToken) return next(new AppError("Invalid device token"));
    await User.findByIdAndUpdate(user._id, { deviceToken: deviceToken });
    return res.json({ status: 200 });
};

export const getFavouritesController = async (req, res, next) => {

    const user = req.user;
    const foundUser = await User.findById(user._id);

    if (!foundUser) {
        return res.status(404).json({ message: 'User not found' });
    }

    return res.status(200).json({ favourites: foundUser.favourites });

};
