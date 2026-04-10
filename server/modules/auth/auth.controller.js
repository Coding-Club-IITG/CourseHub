import axios from "axios";
import qs from "querystring";
import AppError from "../../utils/appError.js";
import catchAsync from "../../utils/catchAsync.js";
import cheerio from "cheerio";

import appConfig from "../../config/default.js";
import links from "../../links.js";

const clientid = process.env.CLIENT_ID;
const clientSecret = process.env.CLIENT_VALUE;
const redirect_uri = process.env.REDIRECT_URI;

import { findUserWithEmail, getUserFromToken, validateUser } from "../user/user.model.js";

import User from "../user/user.model.js";

import academic from "../../config/academic.js";
import courselist from "../course/course.list.js";

import aesjs from "aes-js";
import EncryptText from "../../utils/encryptAES.js";
import { getRandomColor } from "../../utils/generateRandomColor.js";
import academicdata from "../../config/academic.js";
import { UserUpdate } from "../miscellaneous/miscellaneous.model.js";
import {
    createCourseSnapshotOnce,
    createUserSnapshotHelper,
} from "../snapshot/snapshot.controller.js";

import BR from "../br/br.model.js";
import { read } from "fs";
//not used
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
// export const makeGuestHanlder = async (req, res, next) => {
//     const user = await User.create({
//         name: "Guest",
//         email: "guest@coursehubiitg.in",
//         rollNumber: 123456789,
//         semester: 2,
//         degree: "BTECH",
//         courses: [],
//         department: "Guest Login",
//         favourites: [],
//     });
//     res.send(user);
// };

export const fetchCourses = async (rollNumber) => {
    var config = {
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
    const $ = cheerio.load(response.data);
    const courses = [];

    // Get all course codes first and normalize them
    const courseCodes = [];
    $("tr").each((i, elem) => {
        const details = $(elem).find("td");
        const studentRollNo = details.eq(2).text();
        const rawCode = details.eq(3).text(); //course code
        if (rawCode && studentRollNo == rollNumber && !rawCode.includes("SA")) {
            // Normalize the code: remove spaces and convert to uppercase
            const normalizedCode = rawCode.replace(/\s+/g, "").toUpperCase();
            courseCodes.push({
                original: rawCode,
                normalized: normalizedCode,
            });
        }
    });

    // Fetch course names from database using both normalized and original codes
    const CourseModel = (await import("../course/course.model.js")).default;
    const normalizedCodes = courseCodes.map((c) => c.normalized);
    const originalCodes = courseCodes.map((c) => c.original);
    const allCodes = [...normalizedCodes, ...originalCodes];
    const dbCourses = await CourseModel.find({
        code: { $in: allCodes },
    });

    $("tr").each((i, elem) => {
        const details = $(elem).find("td");
        const studentRollNo = details.eq(2).text();
        const rawCode = details.eq(3).text();

        if (rawCode && studentRollNo == rollNumber && !rawCode.includes("SA")) {
            const normalizedCode = rawCode.replace(/\s+/g, "").toUpperCase();

            // Find course name from database first - try both normalized and original codes
            const dbCourse = dbCourses.find(
                (course) =>
                    course.code === normalizedCode ||
                    course.code === rawCode ||
                    course.code.replace(/\s+/g, "").toUpperCase() === normalizedCode
            );

            let name;
            if (dbCourse) {
                name = dbCourse.name;
            } else {
                // Try courselist with both normalized and original codes
                name = courselist[normalizedCode] || courselist[rawCode];
            }

            courses.push({
                name,
                code: normalizedCode, // Store the normalized code consistently
            });
        }
    });

    if (courses.length === 0) {
        throw new AppError(404, "No courses found for this roll number");
    }

    // Update user courses using findOneAndUpdate to avoid version conflicts
    await User.findOneAndUpdate({ rollNumber }, { courses }, { new: true, upsert: false });
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
    var evenConfig = {
        method: "post",
        url: "https://academic.iitg.ac.in/sso/gen/student1.jsp",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
        },
        data: qs.stringify({
            cid: "All",
            sess: "Jan-May",
            yr: academic.currentYear,
        }),
    };
    var oddConfig = {
        method: "post",
        url: "https://academic.iitg.ac.in/sso/gen/student1.jsp",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
        },
        data: qs.stringify({
            cid: "All",
            sess: "July-Nov",
            yr: academic.currentYear - 1,
        }),
    };

    const previousCourses = [];
    const courseCodes = [];

    const [even, odd] = await Promise.all([
            axios.post(evenConfig.url, evenConfig.data, { headers: evenConfig.headers }),
            axios.post(oddConfig.url, oddConfig.data, { headers: oddConfig.headers }),
        ]);

        if (!even.data || !odd.data) {
            throw new AppError(500, "Something went wrong");
        }

        const $even = cheerio.load(even.data);
        const $odd = cheerio.load(odd.data);

        // First pass: collect course codes from both semesters and normalize them
        $even("tr").each((i, elem) => {
            const details = $even(elem).find("td");
            const studentRollNo = details.eq(2).text();
            const rawCode = details.eq(3).text(); //course code

            if (rawCode && studentRollNo == rollNumber && !rawCode.includes("SA")) {
                // Normalize the code: remove spaces and convert to uppercase
                const normalizedCode = rawCode.replace(/\s+/g, "").toUpperCase();
                courseCodes.push({
                    original: rawCode,
                    normalized: normalizedCode,
                });
            }
        });
        $odd("tr").each((i, elem) => {
            const details = $odd(elem).find("td");
            const studentRollNo = details.eq(2).text();
            const rawCode = details.eq(3).text(); //course code

            if (rawCode && studentRollNo == rollNumber && !rawCode.includes("SA")) {
                // Normalize the code: remove spaces and convert to uppercase
                const normalizedCode = rawCode.replace(/\s+/g, "").toUpperCase();
                courseCodes.push({
                    original: rawCode,
                    normalized: normalizedCode,
                });
            }
        });

        // Fetch course names from database using both normalized and original codes
        const CourseModel = (await import("../course/course.model.js")).default;
        const normalizedCodes = courseCodes.map((c) => c.normalized);
        const originalCodes = courseCodes.map((c) => c.original);
        const allCodes = [...normalizedCodes, ...originalCodes];
        const dbCourses = await CourseModel.find({
            code: { $in: allCodes },
        });

        const evenCourses = [];
        const oddCourses = [];

        // Second pass: build courses array with names
        $even("tr").each((i, elem) => {
            const details = $even(elem).find("td");
            const studentRollNo = details.eq(2).text();
            const rawCode = details.eq(3).text(); //course code

            if (rawCode && studentRollNo == rollNumber && !rawCode.includes("SA")) {
                const normalizedCode = rawCode.replace(/\s+/g, "").toUpperCase();

                // Find course name from database first - try both normalized and original codes
                const dbCourse = dbCourses.find(
                    (course) =>
                        course.code === normalizedCode ||
                        course.code === rawCode ||
                        course.code.replace(/\s+/g, "").toUpperCase() === normalizedCode
                );

                let name;
                if (dbCourse) {
                    name = dbCourse.name;
                } else {
                    // Try courselist with both normalized and original codes
                    name = courselist[normalizedCode] || courselist[rawCode];
                }

                evenCourses.push({
                    name,
                    code: normalizedCode, // Store the normalized code consistently
                });
            }
        });
        $odd("tr").each((i, elem) => {
            const details = $odd(elem).find("td");
            const studentRollNo = details.eq(2).text();
            const rawCode = details.eq(3).text(); //course code

            if (rawCode && studentRollNo == rollNumber && !rawCode.includes("SA")) {
                const normalizedCode = rawCode.replace(/\s+/g, "").toUpperCase();

                // Find course name from database first - try both normalized and original codes
                const dbCourse = dbCourses.find(
                    (course) =>
                        course.code === normalizedCode ||
                        course.code === rawCode ||
                        course.code.replace(/\s+/g, "").toUpperCase() === normalizedCode
                );

                let name;
                if (dbCourse) {
                    name = dbCourse.name;
                } else {
                    // Try courselist with both normalized and original codes
                    name = courselist[normalizedCode] || courselist[rawCode];
                }

                oddCourses.push({
                    name,
                    code: normalizedCode, // Store the normalized code consistently
                });
            }
        });
        if (evenCourses.length > 0) {
            previousCourses.push({
                semester: calculateCourseSemesterNumber(rollNumber, academic.currentYear, "Jan-May"),
                year: academic.currentYear,
                courses: evenCourses
            });
        }
        
        if (oddCourses.length > 0) {
            previousCourses.push({
                semester: calculateCourseSemesterNumber(rollNumber, academic.currentYear - 1, "July-Nov"),
                year: academic.currentYear - 1,
                courses: oddCourses
            });
        }

    if (previousCourses.length === 0) {
        throw new AppError(404, "No courses found for this roll number");
    }

    // Update user previousCourses using findOneAndUpdate to avoid version conflicts
    await User.findOneAndUpdate(
        { rollNumber },
        { previousCourses: previousCourses },
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

    if (!roll) {
        throw new AppError(401, "Sign in using Institute Account");
    }

    let existingUser = await findUserWithEmail(userFromToken.data.mail);

    let br = await BR.findOne({ email: userFromToken.data.mail });

    if (!existingUser) {
        const department = await getDepartment(AccessToken, roll);

        const userData = {
            name: userFromToken.data.displayName,
            degree: userFromToken.data.jobTitle,
            rollNumber: userFromToken.data.surname,
            email: userFromToken.data.mail,
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

    let userUpdated = await UserUpdate.findOne({ rollNumber: roll });

    if (existingUser && !userUpdated) {
        existingUser.semester = calculateSemester(userFromToken.data.surname);
        await existingUser.save();
        const newUpdation = new UserUpdate({ rollNumber: roll });
        await newUpdation.save();
    }

    const token = existingUser.generateJWT();

    await createCourseSnapshotOnce(existingUser);

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
    res.redirect(`${appConfig.clientURL}/dashboard`);
};

export const mobileRedirectHandler = async (req, res, next) => {
    const { code } = req.query;

    var data = qs.stringify({
        client_secret: clientSecret,
        client_id: clientid,
        //redirect_uri: redirect_uri,
      redirect_uri: links.COURSEHUB_MOBILE_REDIRECT,
        scope: "user.read",
        grant_type: "authorization_code",
        code: code,
    });

    var config = {
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

    if (!response.data) throw new AppError(500, "Something went wrong");

    const AccessToken = response.data.access_token;
    const RefreshToken = response.data.refresh_token;

    const userFromToken = await getUserFromToken(AccessToken);

    if (!userFromToken || !userFromToken.data) throw new AppError(401, "Access Denied");

    const roll = userFromToken.data.surname;
    if (!roll) throw new AppError(401, "Sign in using Institute Account");

    let existingUser = await findUserWithEmail(userFromToken.data.mail); //find with email

    if (!existingUser) {
        const courses = await fetchCourses(userFromToken.data.surname);
        const department = await getDepartment(AccessToken);

        const userData = {
            name: userFromToken.data.displayName,
            degree: userFromToken.data.jobTitle,
            rollNumber: userFromToken.data.surname,
            email: userFromToken.data.mail,
            // branch: department, //calculate branch
            semester: calculateSemester(userFromToken.data.surname),
            courses: courses,
            department: department,
        };

        const { error } = validateUser(userData);
        if (error) throw new AppError(500, error.message);

        const user = new User(userData);
        existingUser = await user.save();
    }
    let userUpdated = await UserUpdate.findOne({ rollNumber: roll });
    // console.log(userUpdated);
    if (existingUser && !userUpdated) {
        const courses = await fetchCourses(userFromToken.data.surname);
        existingUser.courses = courses;
        existingUser.semester = calculateSemester(userFromToken.data.surname);
        await existingUser.save();
        const newUpdation = new UserUpdate({ rollNumber: roll });
        await newUpdation.save();
    }

    const token = existingUser.generateJWT();
    await createUserSnapshotHelper(existingUser);
    await createCourseSnapshotOnce(existingUser);

    return res.redirect(`${appConfig.mobileURL}://success?token=${token}`);
};

export const logoutHandler = (req, res, next) => {
    //     res.clearCookie("token");
    res.cookie("token", "loggedout", {
        maxAge: 0,
        sameSite: "lax",
        secure: false,
        expires: new Date(Date.now()),
        httpOnly: true,
    });
    res.redirect(appConfig.clientURL);
};
