import "dotenv/config";

const parsedPort = Number(process.env.PORT);

export default {
    port: Number.isNaN(parsedPort) ? undefined : parsedPort,
    mongoURI: process.env.MONGO_URI,
    clientURL: process.env.CLIENT_URL,
    jwtSecret: process.env.JWT_SECRET,
    adminJwtSecret: process.env.ADMIN_JWT_SECRET,
    localApiBaseUrl: process.env.API_BASE_URL,
};
