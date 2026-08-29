import axios from "axios";
import qs from "querystring";
import AppError from "../../utils/appError.js";
import catchAsync from "../../utils/catchAsync.js";

import appConfig from "../../config/default.js";

const clientid = process.env.AZURE_CLIENT_ID;
const clientSecret = process.env.AZURE_CLIENT_SECRET;
const redirect_uri = process.env.REDIRECT_URI;

import { findUserWithEmail, getUserFromToken, validateUser } from "../user/user.model.js";

import User from "../user/user.model.js";

import academic from "../../config/academic.js";
import courselist from "../course/course.list.js";
import { getCourseCodeCaseInsensitiveRegex, normalizeCourseCode, parseCourseAllotmentsFromHtml } from "../../utils/course.js";

import { getRandomColor } from "../../utils/generateRandomColor.js";
import UserUpdate from "../user/userUpdate.model.js";
import BR from "../br/br.model.js";
import CourseAllotment from "../course/courseAllotment.model.js";
import logger from "../../utils/logger.js";

const normalizeEmail = (email) => email?.toString().trim().toLowerCase();

export const loginHandler = (req, res) => {
    res.redirect(
        `https://login.microsoftonline.com/850aa78d-94e1-4bc6-9cf3-8c11b530701c/oauth2/v2.0/authorize?client_id=${clientid}&response_type=code&redirect_uri=${redirect_uri}&scope=user.read%20offline_access&state=12345`
    );
};

export const guestLoginHanlder = async (req, res, next) => {
    const guest = await User.findOne({ email: "guest@coursehubiitg.in" });
    if (!guest) return next(new AppError(500, "Something went wrong."));
    const token = guest.generateJWT();
    res.json({ token });
};



// Helper function to get course names from database and courselist
async function resolveCourseNames(courseCodes, dbCourses) {
    const courses = [];
    const seenCodes = new Set();
    
    for (const { original, normalized } of courseCodes) {
        if (seenCodes.has(normalized)) continue;
        seenCodes.add(normalized);
        
        const dbCourse = dbCourses.find(
            (course) =>
                normalizeCourseCode(course.code) === normalized ||
                normalizeCourseCode(course.code) === normalizeCourseCode(original)
        );
        
        const name = dbCourse?.name || courselist[normalized] || courselist[original];
        
        courses.push({
            name,
            code: normalized,
        });
    }
    
    return courses;
}

export const fetchCourses = async (rollNumber) => {
    const roll = parseInt(rollNumber);
    
    // 1. Try to find the cached allotments
    const cached = await CourseAllotment.findOne({
        rollNumber: roll,
        session: academic.session,
        year: academic.currentYear,
    });

    if (cached) {
        const CourseModel = (await import("../course/course.model.js")).default;
        const allCodes = cached.courses.map(getCourseCodeCaseInsensitiveRegex);
        const dbCourses = await CourseModel.find({ code: { $in: allCodes } });
        
        const courseCodes = cached.courses.map(code => ({ original: code, normalized: code }));
        const courses = await resolveCourseNames(courseCodes, dbCourses);

        await User.updateOne({ rollNumber }, { $set: { courses } });
        return courses;
    }

    // 2. Cache Miss: Fall back to scraping the portal
    const config = {
        method: "post",
        url: "https://academic.iitg.ac.in/sso/gen/student1.jsp",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
        },
        data: qs.stringify({
            cid: "All",
            sess: academic.session,
            yr: academic.currentYear,
        }),
    };
    
    const response = await axios.post(config.url, config.data, {
        headers: config.headers,
    });
    
    if (!response.data) {
        throw new AppError(500, "Something went wrong");
    }
    
    const courseCodes = parseCourseAllotmentsFromHtml(response.data, rollNumber);
    
    if (courseCodes.length === 0) {
        throw new AppError(404, "No courses found for this roll number");
    }
    
    const CourseModel = (await import("../course/course.model.js")).default;
    const allCodes = [
        ...courseCodes.map((c) => normalizeCourseCode(c.normalized)),
        ...courseCodes.map((c) => normalizeCourseCode(c.original)),
    ]
        .filter(Boolean)
        .map(getCourseCodeCaseInsensitiveRegex);
    const dbCourses = await CourseModel.find({ code: { $in: allCodes } });
    
    const courses = await resolveCourseNames(courseCodes, dbCourses);
    
    await User.updateOne({ rollNumber }, { $set: { courses } });

    // Cache the result for next time
    try {
        const rawCodes = courseCodes.map(c => normalizeCourseCode(c.normalized)).filter(Boolean);
        await CourseAllotment.updateOne(
            { rollNumber: roll, session: academic.session, year: academic.currentYear },
            { $set: { courses: rawCodes } },
            { upsert: true }
        );
    } catch (err) {
        logger.error("Course allotment cache failed", { error: err, attributes: { dependency: "mongodb", operation: "cache-course-allotments", outcome: "failure", retryable: true } });
    }
    
    return courses;
};

function calculateCourseSemesterNumber(rollNumber, courseYear, courseSession) {
    const joinYear = 2000 + parseInt(rollNumber.toString().slice(0, 2));
    const diff = courseYear - joinYear;
    let sem = 1;
    if (courseSession.toLowerCase() === "july-nov") {
        sem = 2 * diff + 1;
    } else if (courseSession.toLowerCase() === "jan-may" || courseSession.toLowerCase() === "jan - may") {
        sem = 2 * diff;
    }
    return Math.max(1, sem);
}

export const fetchCoursesForBr = async (rollNumber) => {
    const roll = parseInt(rollNumber);
    const rollstring = rollNumber.toString();
    const currentYear = parseInt(academic.currentYear);
    const startYear = 2000 + parseInt(rollstring.slice(0, 2));

    const previousCourses = [];
    const configs = [];
    
    // Find all semesters cached for this student to minimize network calls
    const cachedSemesters = await CourseAllotment.find({ rollNumber: roll });
    const CourseModel = (await import("../course/course.model.js")).default;
    const dbCourses = await CourseModel.find({});

    for (let yr = startYear; yr <= currentYear; yr++) {
        if (yr > startYear && (yr !== currentYear || academic.session !== "Jan-May")) {
            const cacheHit = cachedSemesters.find(c => c.session === "Jan-May" && c.year === yr);
            if (cacheHit) {
                const courseCodes = cacheHit.courses.map(code => ({ original: code, normalized: code }));
                const semesterCourses = await resolveCourseNames(courseCodes, dbCourses);
                previousCourses.push({
                    semester: calculateCourseSemesterNumber(rollNumber, yr, "Jan-May"),
                    year: yr,
                    courses: semesterCourses
                });
            } else {
                configs.push({
                    sess: "Jan-May",
                    yr: yr,
                    req: {
                        method: "post",
                        url: "https://academic.iitg.ac.in/sso/gen/student1.jsp",
                        headers: { "Content-Type": "application/x-www-form-urlencoded" },
                        data: qs.stringify({ cid: "All", sess: "Jan-May", yr: yr })
                    }
                });
            }
        }

        if ((yr < currentYear || (yr === currentYear && academic.session === "July-Nov")) && 
            (yr !== currentYear || academic.session !== "July-Nov")) {
            const cacheHit = cachedSemesters.find(c => c.session === "July-Nov" && c.year === yr);
            if (cacheHit) {
                const courseCodes = cacheHit.courses.map(code => ({ original: code, normalized: code }));
                const semesterCourses = await resolveCourseNames(courseCodes, dbCourses);
                previousCourses.push({
                    semester: calculateCourseSemesterNumber(rollNumber, yr, "July-Nov"),
                    year: yr,
                    courses: semesterCourses
                });
            } else {
                configs.push({
                    sess: "July-Nov",
                    yr: yr,
                    req: {
                        method: "post",
                        url: "https://academic.iitg.ac.in/sso/gen/student1.jsp",
                        headers: { "Content-Type": "application/x-www-form-urlencoded" },
                        data: qs.stringify({ cid: "All", sess: "July-Nov", yr: yr })
                    }
                });
            }
        }
    }

    if (configs.length > 0) {
        const responses = await Promise.all(
            configs.map(async (c) => {
                const res = await axios.post(c.req.url, c.req.data, { headers: c.req.headers });
                return { data: res.data, sess: c.sess, yr: c.yr };
            })
        );

        responses.forEach((res) => {
            if (!res.data) throw new AppError(500, "Something went wrong fetching courses");
        });

        for (const resObj of responses) {
            const codes = parseCourseAllotmentsFromHtml(resObj.data, rollstring);
            if (codes.length > 0) {
                const semesterCourses = await resolveCourseNames(codes, dbCourses);
                previousCourses.push({
                    semester: calculateCourseSemesterNumber(rollNumber, resObj.yr, resObj.sess),
                    year: resObj.yr,
                    courses: semesterCourses
                });

                // Cache newly fetched historical allotments
                try {
                    const rawCodes = codes.map(c => normalizeCourseCode(c.normalized)).filter(Boolean);
                    await CourseAllotment.updateOne(
                        { rollNumber: roll, session: resObj.sess, year: resObj.yr },
                        { $set: { courses: rawCodes } },
                        { upsert: true }
                    );
                } catch (err) {
                    logger.error("BR course cache failed", { error: err, attributes: { dependency: "mongodb", operation: "cache-br-courses", outcome: "failure", retryable: true } });
                }
            }
        }
    }

    previousCourses.sort((a, b) => a.semester - b.semester);

    await User.updateOne({ rollNumber }, { $set: { previousCourses } });

    return previousCourses;
};

const getDepartment = async (access_token, roll) => {
    let rollstring = roll.toString();
    const rollmap = {
        "06": "Biosciences and Bioengineering",
        "07": "Chemical Engineering",
        22: "Chemical Science and Technology",
        "04": "Civil Engineering",
        "01": "Computer Science and Engineering",
        50: "Data Science and Artificial Intelligence",
        "02": "Electronics and Communication Engineering",
        "08": "Electronics and Electrical Engineering",
        51: "Energy Engineering",
        21: "Engineering Physics",
        23: "Mathematics and Computing",
        "03": "Mechanical Engineering",
    };
    if (rollstring.slice(2, 4) == "01" && rollstring.slice(4, 6) != "05") {
        const dep = rollmap[rollstring.slice(4, 6)];
        if (dep) return rollmap[rollstring.slice(4, 6)];
    }
    var config = {
        method: "get",
        url: "https://graph.microsoft.com/beta/me/profile",
        headers: {
            Authorization: `Bearer ${access_token}`,
            "Content-Type": "application/x-www-form-urlencoded",
            Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8",
            Host: "graph.microsoft.com",
        },
    };
    const response = await axios.get(config.url, {
        headers: config.headers,
    });
    return response.data.positions[0].detail.company.department;
};

function calculateSemester(rollNumber) {
    const year = parseInt(rollNumber.slice(0, 2));
    const currdate = new Date();
    const curryear = currdate.getFullYear() % 100;
    const diff = curryear - year;
    const properdate = (currdate.getMonth() + 1) * 100 + currdate.getDate();
    if (properdate < 723 && properdate > 103) return 2 * diff;
    else return 2 * diff + 1;
}

export const redirectHandler = async (req, res, next) => {
    const { code } = req.query;

    const data = qs.stringify({
        client_secret: clientSecret,
        client_id: clientid,
        redirect_uri: redirect_uri,
        scope: "user.read",
        grant_type: "authorization_code",
        code: code,
    });

    let newUser = false;

    const config = {
        method: "post",
        url: `https://login.microsoftonline.com/850aa78d-94e1-4bc6-9cf3-8c11b530701c/oauth2/v2.0/token`,
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            client_secret: clientSecret,
        },
        data: data,
    };

    const response = await axios.post(config.url, config.data, {
        headers: config.headers,
    });

    if (!response.data) {
        throw new AppError(500, "Something went wrong");
    }

    const AccessToken = response.data.access_token;
    const RefreshToken = response.data.refresh_token;

    const userFromToken = await getUserFromToken(AccessToken);

    if (!userFromToken || !userFromToken.data) {
        throw new AppError(401, "Access Denied");
    }

    const roll = userFromToken.data.surname;
    const normalizedEmail = normalizeEmail(userFromToken.data.mail);

    if (!roll) {
        throw new AppError(401, "Sign in using Institute Account");
    }

    let existingUser = await findUserWithEmail(normalizedEmail);

    let br = await BR.findOne({ email: normalizedEmail }).collation({
        locale: "en",
        strength: 2,
    });

    if (!existingUser) {
        const department = await getDepartment(AccessToken, roll);

        const userData = {
            name: userFromToken.data.displayName,
            degree: userFromToken.data.jobTitle,
            rollNumber: userFromToken.data.surname,
            email: normalizedEmail,
            semester: calculateSemester(userFromToken.data.surname),
            courses: [],
            department: department,
            isBR: br ? true : false,
            previousCourses: br ? [] : [],
            readOnly: [],
        };

        const { error } = validateUser(userData);
        if (error) {
            throw new AppError(500, error.message);
        }

        const user = new User(userData);
        existingUser = await user.save();
        newUser = true;
    }

    if (existingUser && br && !existingUser.isBR) {
        existingUser.isBR = true;
        await existingUser.save();
    }

    let userUpdated = await UserUpdate.findOne({ rollNumber: roll });

    if (existingUser && !userUpdated) {
        existingUser.semester = calculateSemester(userFromToken.data.surname);
        await existingUser.save();
        const newUpdation = new UserUpdate({ rollNumber: roll });
        await newUpdation.save();
    }

    const token = existingUser.generateJWT();

    logger.metric?.("user_login", {
        value: 1, 
        dimensions: { 
            userEmail: existingUser.email, 
            isBR: existingUser.isBR || false,
            department: existingUser.department,
            semester: existingUser.semester
        }
    });

    res.cookie("token", token, {
        maxAge: 2073600000,
        sameSite: "lax",
        secure: false,
        expires: new Date(Date.now() + 2073600000),
        httpOnly: true,
    });

    if (newUser || (existingUser && !userUpdated)) {
        return res.redirect(`${appConfig.clientURL}/loading`);
    }

    const needsCourseSync =
        !!existingUser?.isBR &&
        (!Array.isArray(existingUser.previousCourses) || existingUser.previousCourses.length === 0);

    if (needsCourseSync) {
        return res.redirect(`${appConfig.clientURL}/loading`);
    }

    res.redirect(`${appConfig.clientURL}/dashboard`);
};

export const logoutHandler = (req, res, next) => {
    res.cookie("token", "loggedout", {
        maxAge: 0,
        sameSite: "lax",
        secure: false,
        expires: new Date(Date.now()),
        httpOnly: true,
    });
    res.redirect(appConfig.clientURL);
};
