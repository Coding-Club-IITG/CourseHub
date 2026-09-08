import { devNull } from "node:os";

process.env.DOTENV_CONFIG_PATH = devNull;
process.env.NODE_ENV = "test";
process.env.OPS_LOGGING_ENABLED = "false";
process.env.MONGO_URI = "mongodb://127.0.0.1:1/coursehub_test_no_connection";
process.env.JWT_SECRET = "coursehub-student-unit-test-key";
process.env.ADMIN_JWT_SECRET = "coursehub-admin-unit-test-key";
process.env.IMAGEKIT_URL_ENDPOINT = "https://ik.imagekit.io/coursehub-test/";
process.env.ONEDRIVE_FOLDER_ID = "test-storage-root";
