import path from "node:path";
import { fileURLToPath } from "node:url";
export { uploadLimits } from "@coursehub/domain";

const serverDirectory = fileURLToPath(new URL("../", import.meta.url));
export const graphChunkBytes = 10 * 320 * 1024;
export const tokenDirectory = () => path.resolve(process.env.ONEDRIVE_TOKEN_DIR || serverDirectory);
export const uploadDirectory = () =>
    path.resolve(process.env.UPLOAD_TEMP_DIR || path.join(serverDirectory, "external/uploads"));
export const storageRoot = () => {
    const id = process.env.ONEDRIVE_FOLDER_ID;
    if (!id) throw new Error("Configure ONEDRIVE_FOLDER_ID");
    return id;
};
