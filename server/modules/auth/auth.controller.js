import { graph } from "../../services/graphClient.js";
import axios from "axios";
import qs from "querystring";
import AppError from "../../utils/appError.js";
import { beginOAuth, consumeOAuth, oauthEndpoint } from "../../services/oauth.js";
import {
    createSession,
    setSessionCookie,
    clearSessionCookie,
    revokeSession,
} from "../../services/sessions.js";

import appConfig from "../../config/default.js";

const clientid = process.env.AZURE_CLIENT_ID;
const clientSecret = process.env.AZURE_CLIENT_SECRET;
const redirect_uri = process.env.REDIRECT_URI;

import { findUserWithEmail, getUserFromToken, validateUser } from "../user/user.model.js";

import User from "../user/user.model.js";

import BR from "../br/br.model.js";
import { academicPeriod, courseSemester } from "../../services/academicPeriod.js";
import { scheduleStudentSync, synchronizationStatus } from "../../services/academicSync.js";
import logger from "../../utils/logger.js";

const normalizeEmail = (email) => email?.toString().trim().toLowerCase();

export const loginHandler = beginOAuth;

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
    const response = await graph.request("/beta/me/profile", { token: access_token });
    return response.data.positions[0].detail.company.department;
};

export const redirectHandler = async (req, res, next) => {
    const attempt = await consumeOAuth(req, res);
    const { code } = req.query;

    const data = qs.stringify({
        client_secret: clientSecret,
        client_id: clientid,
        redirect_uri: redirect_uri,
        scope: "user.read",
        grant_type: "authorization_code",
        code: code,
        code_verifier: attempt.verifier,
    });

    const config = {
        method: "post",
        url: oauthEndpoint("token"),
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
        },
        data: data,
    };

    const response = await axios.post(config.url, config.data, {
        headers: config.headers,
        timeout: 30000,
    });

    if (!response.data) {
        throw new AppError(500, "Something went wrong");
    }

    const AccessToken = response.data.access_token;

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
            semester: courseSemester(userFromToken.data.surname, academicPeriod()),
            courses: [],
            department: department,
            isBR: br ? true : false,
            previousCourses: [],
            readOnly: [],
        };

        const { error } = validateUser(userData);
        if (error) {
            throw new AppError(500, error.message);
        }

        const user = new User(userData);
        existingUser = await user.save();
    }

    if (existingUser.isBR !== Boolean(br)) {
        await User.updateOne({ _id: existingUser._id }, { $set: { isBR: Boolean(br) } });
        existingUser.isBR = Boolean(br);
    }

    const { token } = await createSession(existingUser._id, "student");

    logger.metric?.("user_login", {
        value: 1,
        dimensions: {
            userEmail: existingUser.email,
            isBR: existingUser.isBR || false,
            department: existingUser.department,
            semester: existingUser.semester,
        },
    });

    setSessionCookie(res, "student", token);

    try {
        const synchronization = await synchronizationStatus(existingUser, { isBR: Boolean(br) });
        if (synchronization.needsSync) {
            await scheduleStudentSync(existingUser);
            return res.redirect(
                appConfig.clientURL + "/loading?returnTo=" + encodeURIComponent(attempt.returnTo),
            );
        }
    } catch (error) {
        logger.warn("Signed-in student course synchronization needs retry", {
            attributes: {
                operation: "schedule-student-sync",
                outcome: "failure",
                code: error.code || "SYNC_UNAVAILABLE",
            },
        });
    }

    res.redirect(new URL(attempt.returnTo, appConfig.clientURL).href);
};

export const logoutHandler = async (req, res) => {
    await revokeSession(req.session);
    clearSessionCookie(res, "student");
    res.json({ success: true });
};
