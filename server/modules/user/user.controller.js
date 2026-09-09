import { mutateContent } from "../../services/contentMutation.js";
import AppError from "../../utils/appError.js";
import logger from "../../utils/logger.js";
import User from "./user.model.js";
import {
    addToFavourites,
    removeFromFavourites,
    AddReadOnlyCourse,
    RemoveReadOnly,
} from "./user.model.js";
import { updateUserData } from "./user.model.js";
import { synchronizationStatus, scheduleStudentSync } from "../../services/academicSync.js";
import {
    actorFor,
    requireFile,
    requireCourse,
    libraryGraph,
} from "../../services/authorization.js";
import { normalizeCourseCode } from "../../utils/course.js";

async function visibleFavourites(req, user) {
    const favourites = [];
    for (const favourite of user.favourites || []) {
        try {
            const { file } = await requireFile(req, favourite.id, favourite.code);
            favourites.push({ ...(favourite.toObject?.() || favourite), name: file.name });
        } catch (error) {
            if (error.status !== 404) throw error;
        }
    }
    return favourites;
}
async function userResult(req, user) {
    const actor = await actorFor(req);
    return {
        ...user.toObject(),
        isBR: actor.isBR,
        capabilities: {
            canManageCourses: actor.managed,
            canContributeCourses: [...new Set([...actor.current, ...actor.managed])],
        },
        favourites: await visibleFavourites(req, user),
    };
}

let currentDay = new Date().toISOString().split("T")[0];
let activeUsersToday = new Set();

let currentHour = new Date().toISOString().substring(0, 13);
let activeUsersThisHour = new Set();

export const getUser = async (req, res, next) => {
    const user = req.user;

    const now = new Date();
    const today = now.toISOString().split("T")[0];
    const thisHour = now.toISOString().substring(0, 13);

    // 1. Daily Cache
    if (today !== currentDay) {
        activeUsersToday.clear();
        currentDay = today;
    }

    // 2. Hourly Cache
    if (thisHour !== currentHour) {
        activeUsersThisHour.clear();
        currentHour = thisHour;
    }

    if (user && user.email) {
        const dimensions = {
            userEmail: user.email,
            department: user.department,
            semester: user.semester,
        };

        if (!activeUsersToday.has(user.email)) {
            activeUsersToday.add(user.email);
            logger.metric?.("daily_active_user", { value: 1, dimensions });
        }

        if (!activeUsersThisHour.has(user.email)) {
            activeUsersThisHour.add(user.email);
            logger.metric?.("hourly_active_user", { value: 1, dimensions });
        }
    }

    const actor = await actorFor(req);
    const isBranchRep = actor.isBR;

    const previousCourses = Array.isArray(user.previousCourses) ? user.previousCourses : [];
    const synchronization = await synchronizationStatus(user, { isBR: isBranchRep });

    const responseUser = {
        csrfToken: req.session.csrfToken,
        _id: user._id,
        name: user.name,
        email: user.email,
        rollNumber: user.rollNumber,
        semester: user.semester,
        degree: user.degree,
        courses: user.courses,
        department: user.department,
        favourites: await visibleFavourites(req, user),
        deviceToken: user.deviceToken,
        isBR: isBranchRep,
        capabilities: {
            canManageCourses: actor.managed,
            canContributeCourses: [...new Set([...actor.current, ...actor.managed])],
        },
        readOnly: user.readOnly,
        needsCourseSync: synchronization.needsSync,
        synchronization,
    };

    if (isBranchRep) {
        responseUser.previousCourses = previousCourses;
    }

    return res.status(200).json(responseUser);
};

export const updateUserController = async (req, res) => {
    if (Object.keys(req.body).some((key) => key !== "newUserData"))
        throw new AppError(400, "Unexpected profile fields", "VALIDATION_FAILED");
    const saved = await updateUserData(req.user._id, req.body.newUserData);
    res.json(saved);
};
export const addToFavouriteController = async (req, res) => {
    const data = req.body;
    if (!data.id || !data.path || !data.code) throw new AppError(400, "File context is required");
    return mutateContent(req, [data.code], async () => {
        const context = await requireFile(req, data.id, data.code);
        const user = await addToFavourites(
            req.user._id,
            context.file.name,
            data.id,
            data.path,
            context.code,
        );
        res.json(await userResult(req, user));
    });
};
export const addReadOnly = async (req, res) => {
    return mutateContent(req, [req.body.code], async () => {
        const context = await requireCourse(req, req.body.code);
        const user = await AddReadOnlyCourse(req.user._id, context.code, context.course.name);
        res.json(await userResult(req, user));
    });
};
export const deleteReadOnly = async (req, res) => {
    return mutateContent(req, [req.params.code], async () => {
        const graph = await libraryGraph(req),
            raw = normalizeCourseCode(req.params.code);
        const user = await RemoveReadOnly(req.user._id, graph.aliases?.get(raw) || raw);
        res.json(await userResult(req, user));
    });
};

export const removeFromFavouritesController = async (req, res, next) => {
    const { id } = req.params;
    if (!id) return res.sendStatus(400);
    //validate
    const updatedUser = await removeFromFavourites(req.user._id, id);
    return res.status(200).json(await userResult(req, updatedUser));
};
export const updateDeviceToken = async (req, res, next) => {
    const user = req.user;
    const { deviceToken } = req.body;
    if (!deviceToken) return next(new AppError(400, "Invalid device token"));
    await User.findByIdAndUpdate(user._id, { deviceToken: deviceToken });
    return res.json({ status: 200 });
};

export const getFavouritesController = async (req, res, next) => {
    const user = req.user;
    const foundUser = await User.findById(user._id);

    if (!foundUser) {
        return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({ favourites: await visibleFavourites(req, foundUser) });
};

export async function synchronizeCourses(req, res) {
    if (
        !req.body ||
        typeof req.body !== "object" ||
        Array.isArray(req.body) ||
        Object.keys(req.body).length
    )
        throw new AppError(
            400,
            "This endpoint synchronizes only the signed-in student",
            "VALIDATION_FAILED",
        );
    res.status(202).json(await scheduleStudentSync(req.user));
}
