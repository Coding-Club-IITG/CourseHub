import "dotenv/config";

console.log(process.env);
export default {
    port: process.env.PORT || 8080,
    mongoURI: process.env.MONGO_URI,
    // clientURL: process.env.CLIENT_URL,
    clientURL: process.env.CLIENT_URL,
    serverBase: process.env.SERVER_BASE,
    mobileURL: process.env.MOBILE_URL,
    jwtSecret: process.env.JWT_SECRET,
    aesKey: process.env.AESKEY,
    adminJwtSecret: "32rytfhgv456ryt43ertfgy45rtfhh",
    serverVersion: 1.3,
};
