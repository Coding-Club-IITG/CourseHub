import axios from "axios";
import qs from "querystring";
import AppError from "../../utils/appError.js";
import catchAsync from "../../utils/catchAsync.js";
import cheerio from "cheerio";

import appConfig from "../../config/default.js";

const clientid = process.env.AZURE_CLIENT_ID;
const clientSecret = process.env.AZURE_CLIENT_SECRET;
const redirect_uri = process.env.REDIRECT_URI;

import { findUserWithEmail, getUserFromToken, validateUser } from "../user/user.model.js";

import User from "../user/user.model.js";

import academic from "../../config/academic.js";
import courselist from "../course/course.list.js";

import { getRandomColor } from "../../utils/generateRandomColor.js";
import UserUpdate from "../user/userUpdate.model.js";

import BR from "../br/br.model.js";

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

// Helper function to parse courses from HTML response
function parseCoursesFromHtml(htmlData, rollNumber) {
    const $ = cheerio.load(htmlData);
    const courseCodes = [];
    
    $("tr").each((i, elem) => {
        const details = $(elem).find("td");
        const studentRollNo = details.eq(2).text();
        const rawCode = details.eq(3).text();
        
        if (rawCode && studentRollNo == rollNumber && !rawCode.includes("SA")) {
            const normalizedCode = rawCode.replace(/\s+/g, "").toUpperCase();
            courseCodes.push({
                original: rawCode,
                normalized: normalizedCode,
            });
        }
    });
    
    return courseCodes;
}

// Helper function to get course names from database and courselist
async function resolveCourseNames(courseCodes, dbCourses) {
    const courses = [];
    const seenCodes = new Set();
    
    for (const { original, normalized } of courseCodes) {
        if (seenCodes.has(normalized)) continue;
        seenCodes.add(normalized);
        
        const dbCourse = dbCourses.find(
            (course) =>
                course.code === normalized ||
                course.code === original ||
                course.code.replace(/\s+/g, "").toUpperCase() === normalized
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
    
    const courseCodes = parseCoursesFromHtml(response.data, rollNumber);
    
    if (courseCodes.length === 0) {
        throw new AppError(404, "No courses found for this roll number");
    }
    
    const CourseModel = (await import("../course/course.model.js")).default;
    const allCodes = [
        ...courseCodes.map((c) => c.normalized),
        ...courseCodes.map((c) => c.original),
    ];
    const dbCourses = await CourseModel.find({ code: { $in: allCodes } });
    
    const courses = await resolveCourseNames(courseCodes, dbCourses);
    
    await User.findOneAndUpdate(
        { rollNumber },
        { courses },
        { new: true, upsert: false }
    );
    
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
    const rollstring = rollNumber.toString();
    const currentYear = parseInt(academic.currentYear);
    const startYear = 2000 + parseInt(rollstring.slice(0, 2));

    const configs = [];

    for (let yr = startYear; yr <= currentYear; yr++) {
        if (yr > startYear && (yr !== currentYear || academic.session !== "Jan-May")) {
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

        if ((yr < currentYear || (yr === currentYear && academic.session === "July-Nov")) && 
            (yr !== currentYear || academic.session !== "July-Nov")) {
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

    const responses = await Promise.all(
        configs.map(async (c) => {
            const res = await axios.post(c.req.url, c.req.data, { headers: c.req.headers });
            return { data: res.data, sess: c.sess, yr: c.yr };
        })
    );

    responses.forEach((res) => {
        if (!res.data) throw new AppError(500, "Something went wrong fetching courses");
    });

    const courseCodes = [];
    responses.forEach((resObj) => {
        const codes = parseCoursesFromHtml(resObj.data, rollstring);
        courseCodes.push({ codes, sess: resObj.sess, yr: resObj.yr });
    });

    const CourseModel = (await import("../course/course.model.js")).default;
    const allCourseCodesFlat = courseCodes.flatMap((c) => c.codes);
    const allCodes = [
        ...allCourseCodesFlat.map((c) => c.normalized),
        ...allCourseCodesFlat.map((c) => c.original),
    ];
    const dbCourses = await CourseModel.find({ code: { $in: allCodes } });

    const previousCourses = [];

    for (const { codes, sess, yr } of courseCodes) {
        if (codes.length > 0) {
            const semesterCourses = await resolveCourseNames(codes, dbCourses);
            previousCourses.push({
                semester: calculateCourseSemesterNumber(rollNumber, yr, sess),
                year: yr,
                courses: semesterCourses
            });
        }
    }

    previousCourses.sort((a, b) => a.semester - b.semester);

    await User.findOneAndUpdate(
        { rollNumber },
        { previousCourses },
        { new: true, upsert: false }
    );

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
