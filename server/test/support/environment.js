import { devNull } from "node:os";

process.env.DOTENV_CONFIG_PATH = devNull;
process.env.NODE_ENV = "test";
process.env.ALLOWED_ORIGINS = "http://client.coursehub.test";
process.env.CLIENT_URL = "http://client.coursehub.test";
process.env.AZURE_CLIENT_ID = "test-client-id";
process.env.REDIRECT_URI = "http://api.coursehub.test/api/auth/login/redirect";
process.env.OPS_LOGGING_ENABLED = "false";
process.env.MONGO_URI = "mongodb://127.0.0.1:1/coursehub_test_no_connection";
process.env.JWT_SECRET = "coursehub-student-unit-test-key";
process.env.ADMIN_JWT_SECRET = "coursehub-admin-unit-test-key";
process.env.IMAGEKIT_URL_ENDPOINT = "https://ik.imagekit.io/coursehub-test/";
process.env.ONEDRIVE_FOLDER_ID = "test-storage-root";
process.env.ONEDRIVE_TOKEN_DIR = `/tmp/coursehub-test-unprovisioned-${process.pid}`;
