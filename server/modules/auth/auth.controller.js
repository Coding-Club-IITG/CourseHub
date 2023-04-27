import axios from "axios";
import qs from "querystring";
import AppError from "../../utils/appError.js";
import catchAsync from "../../utils/catchAsync.js";
import cheerio from "cheerio";

import appConfig from "../../config/default.js";

const clientid = process.env.CLIENT_ID;
const clientSecret = process.env.CLIENT_VALUE;
const redirect_uri = process.env.REDIRECT_URI;

import { findUserWithEmail, getUserFromToken, validateUser } from "../user/user.model.js";

import User from "../user/user.model.js";

import academic from "../../config/academic.js";

import aesjs from "aes-js";
import EncryptText from "../../utils/encryptAES.js";
import { getRandomColor } from "../../utils/generateRandomColor.js";
import academicdata from "../../config/academic.js";

//not used
export const loginHandler = (req, res) => {
    res.redirect(
        `https://login.microsoftonline.com/850aa78d-94e1-4bc6-9cf3-8c11b530701c/oauth2/v2.0/authorize?client_id=${clientid}&response_type=code&redirect_uri=${redirect_uri}&scope=offline_access%20user.read&state=12345`
    );
};
export const guestLoginHanlder = async (req, res, next) => {
    const guest = await User.findOne({ email: "guest@coursehubiitg.in" });
    if (!guest) return next(new AppError(500, "Something went wrong."));
    const token = guest.generateJWT();
    res.json({ token });
};
export const fetchCourses = async (rollNumber) => {
    var config = {
        method: "post",
        url: "https://academic.iitg.ac.in/sso/gen/student2.jsp",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8",
            Host: "academic.iitg.ac.in",
            "Content-Length": "13",
        },
        data: qs.stringify({
            rno: `${rollNumber}`,
        }),
    };

    const response = await axios.post(config.url, config.data, {
        headers: config.headers,
    });

    if (!response.data) throw new AppError(500, "Something went wrong");

    const $ = cheerio.load(response.data);

    const courses = [];

    $("tbody")
        .first()
        .find("tr")
        .each((i, tr) => {
            const details = $(tr).children("td");
            var code = $(details[0]).text().trim().replace(" ", "");
            const name = $(details[1]).text().trim();
            const year = $(details[6]).text().trim();
            const session = $(details[7]).text().trim();

            if (
                year === academic.currentYear &&
                session.includes(academic.sessionIncluesMonth) &&
                code.length >= 5 &&
                code.length <= 6 &&
                !code.includes("SA")
            ) {
                var code = code.substring(0, 5);
                let color = getRandomColor();
                courses.push({
                    code,
                    name,
                    color,
                });
            }
        });
    return courses;
};
const getDepartment = async (access_token) => {
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
    const semester = academicdata.semesterMap[year];
    return semester;
}

export const redirectHandler = async (req, res, next) => {
    const { code } = req.query;

    var data = qs.stringify({
        client_secret: clientSecret,
        client_id: clientid,
        //redirect_uri: redirect_uri,
        redirect_uri: "https://www.coursehubiitg.in/api/auth/login/redirect",
        scope: "user.read",
        grant_type: "authorization_code",
        code: code,
    });

    console.log(data);

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

    console.log(response.data);

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
            semester: calculateSemester(userFromToken.data.surname), //calculate sem
            courses: courses,
            department: department,
        };

        const { error } = validateUser(userData);
        if (error) throw new AppError(500, error.message);

        const user = new User(userData);
        existingUser = await user.save();
    }

    const token = existingUser.generateJWT();

    res.cookie("token", token, {
        maxAge: 2073600000,
        sameSite: "lax",
        secure: false,
        expires: new Date(Date.now() + 2073600000),
        httpOnly: true,
    });

    return res.redirect(appConfig.clientURL);
};
export const mobileRedirectHandler = async (req, res, next) => {
    const { code } = req.query;

    var data = qs.stringify({
        client_secret: clientSecret,
        client_id: clientid,
        //redirect_uri: redirect_uri,
        redirect_uri: "https://www.coursehubiitg.in/api/auth/login/redirect/mobile",
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

    const token = existingUser.generateJWT();

    //     const encryptedToken = EncryptText(token);

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
