import nodemailer from "nodemailer";
import logger from "../utils/logger.js";

let emailClient = {
    email: "coursehubiitg@outlook.com",
    password: "Xidc4545#",
};

function sendEmail(to, subject, msg) {
    const transporter = nodemailer.createTransport({
        service: "outlook",
        auth: {
            user: emailClient.email,
            pass: emailClient.password,
        },
    });
    const options = {
        from: emailClient.email,
        to: to,
        subject: subject,
        text: msg,
    };
    transporter.sendMail(options, function (err, info) {
        if (err) {
            logger.error(err);
            return;
        }
        logger.info("Sent", info.response);
    });
}

export default sendEmail;
