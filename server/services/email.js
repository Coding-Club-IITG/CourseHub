import nodemailer from "nodemailer";
import logger from "../utils/logger.js";

const emailClient = { email: process.env.MAIL_USER, password: process.env.MAIL_PASSWORD };

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
            logger.error("Email delivery failed", { error: err, attributes: { dependency: "outlook", operation: "send-email", outcome: "failure", retryable: true } });
            return;
        }
        logger.info("Email delivered", { attributes: { dependency: "outlook", operation: "send-email", outcome: "success" } });
    });
}

export default sendEmail;
