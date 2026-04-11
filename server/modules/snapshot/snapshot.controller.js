import AppError from "../../utils/appError.js";
import CourseModel from "../course/course.model.js";
import UserSnapshot, { OriginalCoursesSnapshot } from "./snapshot.model.js";
import logger from "../../utils/logger.js";

export const createUserSnapshotHelper = async (user) => {
    await UserSnapshot.deleteMany({ email: user.email });
    const newSnapshot = new UserSnapshot({
        name: user.name,
        email: user.email,
        courses: user.courses,
        favourites: user.favourites,
    });
    await newSnapshot.save();
};

export const getUserDifference = async (req, res, next) => {
    const user = req.user;
    const userSnapshot = await UserSnapshot.findOne({ email: user.email });

    if (!userSnapshot) {
        return res.json({
            coursesAdded: [],
            coursesDeleted: [],
            updatedCourses: [],
            isFavouriteUpdated: false,
        });
    }
    let [addedCourses, coursesDeleted] = getDifferenceHelper(
        getCourseCodeArr(userSnapshot.courses),
        getCourseCodeArr(user.courses)
    );
    let [favouritesAdded, favouritesDeleted] = getDifferenceHelper(
        getFavIdArr(userSnapshot.favourites),
        getFavIdArr(user.favourites)
    );

    let coursesAdded = await CourseModel.find({ code: { $in: addedCourses } });

    let isFavouriteUpdated = favouritesAdded.length > 0 || favouritesDeleted.length > 0;

    let clientDate = userSnapshot.createdAt;
    let coursesArr = getCourseCodeArr(user.courses);
    const updatedCoursesArr = await CourseModel.find({
        $and: [{ code: { $in: coursesArr } }, { updatedAt: { $gte: clientDate } }],
    });

    const updatedCourses = getCourseCodeArr(updatedCoursesArr);

    // updating snapshot after every mobile fetch
    await createUserSnapshotHelper(user);

    return res.json({
        coursesAdded,
        coursesDeleted,
        updatedCourses,
        isFavouriteUpdated,
    });
};

function getDifferenceHelper(clientArr, serverArr) {
    const serverSet = new Set();
    const clientSet = new Set();
    for (let i = 0; i < serverArr.length; i++) {
        serverSet.add(serverArr[i]);
    }
    for (let i = 0; i < clientArr.length; i++) {
        clientSet.add(clientArr[i]);
    }
    for (let i = 0; i < clientArr.length; i++) {
        if (serverSet.has(clientArr[i])) {
            serverSet.delete(clientArr[i]);
        }
    }
    for (let i = 0; i < serverArr.length; i++) {
        if (clientSet.has(serverArr[i])) {
            clientSet.delete(serverArr[i]);
        }
    }
    let added = [];
    let deleted = [];
    serverSet.forEach((code) => added.push(code));
    clientSet.forEach((code) => deleted.push(code));
    return [added, deleted];
}

function getCourseCodeArr(courses) {
    let ret = [];
    courses.map((c) => ret.push(c.code.toLowerCase()));
    return ret;
}

function getFavIdArr(favs) {
    let ret = [];
    favs.map((c) => ret.push(c.id));
    return ret;
}

export const updateUserSnapshot = async (req, res, next) => {
    const user = req.user;
    await createUserSnapshotHelper(user);
    res.json({ updatedUser: true });
};

export const createCourseSnapshotOnce = async (user) => {
    const exists = await OriginalCoursesSnapshot.findOne({ email: user.email });
    if (exists) {
        logger.info("Course snapshot exists...");
        return;
    }
    await createOriginalCoursesSnapshotHelper(user);
};
export const createOriginalCoursesSnapshotHelper = async (user) => {
    logger.info("Creating course snapshot...");

    await OriginalCoursesSnapshot.deleteMany({ email: user.email });
    const newSnapshot = new OriginalCoursesSnapshot({ email: user.email, courses: user.courses });
    await newSnapshot.save();
};
export const getOriginalCourses = async (req, res, next) => {
    const user = req.user;
    const snapshot = await OriginalCoursesSnapshot.findOne({ email: user.email });
    if (!snapshot) return res.json({ message: "No snapshot found!", found: false });
    return res.json({ message: "Courses snapshot found!", found: true, data: snapshot.courses });
};
