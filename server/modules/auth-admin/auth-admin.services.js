import config from "../../config/default.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import OTP from "./otp.model.js";
import sendEmail from "../../services/email.js";

const adminJwtSecret = config.adminJwtSecret;

export async function signAdminJWT(_id) {
    const signed = jwt.sign(_id, adminJwtSecret);
    return signed;
}

export async function verifyAdminJWT(token) {
    try {
        const decoded = jwt.verify(token, adminJwtSecret);
        return decoded;
    } catch (error) {
        return false;
    }
}

export async function tryAuthenticate(candidatePassword, hashedPassword) {
    const match = await bcrypt.compare(candidatePassword, hashedPassword);
    if (!match) return false;
    return true;
}

export async function generateOTP(username, email) {
    await OTP.deleteMany({ email: email });
    const newOtp = Math.floor(100000 + Math.random() * 900000);
    const otp = await OTP.create({
        username: username,
        email: email,
        otp: newOtp,
    });
    // send email
    sendEmail(email, "[COURSEHUB] CourseHub Admin Login OTP", `Your OTP is ${newOtp}`);
    return otp;
}

export async function verifyOTP(email, otp) {
    const otpFromDB = await OTP.findOne({ email: email });
    if (!otpFromDB) return false;
    if (otp !== otpFromDB.otp) {
        sendEmail(
            email,
            "[COURSEHUB] Login attempt",
            "Login attempt using your credentials but wrong OTP"
        );
        await OTP.deleteMany({ email: email });
        return false;
    }
    await OTP.deleteMany({ email: email });
    sendEmail(email, "[COURSEHUB] Login successful", "Loggedin Successfully");
    return true;
}
