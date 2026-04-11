import AppError from "../../utils/appError.js";
import User, { RemoveCourse } from "./user.model.js";
import { addToFavourites, removeFromFavourites, AddNewCourse , AddReadOnlyCourse,  RemoveReadOnly } from "./user.model.js";
import { updateUserData } from "./user.model.js";
import UserUpdate from "./userUpdate.model.js";
import BR from "../br/br.model.js";

export const getUser = async (req, res, next) => {
    const user = req.user;

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

    const isBR = await BR.findOne({ email: user.email });

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
        isBR: !!isBR,
        readOnly: user.readOnly,
    };

    if (isBR) {
        responseUser.previousCourses = user.previousCourses;
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
        data.code
    );
    return res.status(200).json(updatedUser);
};
export const addNewCourse = async (req, res, next) => {
    const data = req.body;
    if (!data.code || !data.name) return res.sendStatus(400);

    const updatedUser = await AddNewCourse(req.user._id, data.code, data.name);
    return res.status(200).json(updatedUser);
};

export const addReadOnly = async (req, res, next) => {
    const data = req.body;
    if (!data.code || !data.name) return res.sendStatus(400);

    const updatedUser = await AddReadOnlyCourse(req.user._id, data.code, data.name);
    return res.status(200).json(updatedUser);
};

export const deleteCourse = async (req, res, next) => {
    const { code } = req.params;
    if (!code) return res.sendStatus(400);
    const updatedUser = await RemoveCourse(req.user._id, code);

    return res.status(200).json(updatedUser);
};

export const deleteReadOnly = async (req, res, next) => {
    const { code } = req.params;
    if (!code) return res.sendStatus(400);
    const updatedUser = await RemoveReadOnly(req.user._id, code);

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