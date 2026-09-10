import Admin from "./admin.model.js";

export class AdminProvisioningError extends Error {
    constructor(code, message) {
        super(message);
        this.name = "AdminProvisioningError";
        this.code = code;
    }
}

export function validateAdminCredentials({ userId, password } = {}) {
    if (
        typeof userId !== "string" ||
        !userId.trim() ||
        userId.trim().length > 128 ||
        /[\u0000-\u001f\u007f]/u.test(userId)
    ) {
        throw new AdminProvisioningError(
            "INVALID_USER_ID",
            "An explicit ADMIN_USER_ID is required (1-128 characters, without control characters).",
        );
    }
    // bcrypt uses at most 72 UTF-8 bytes
    if (
        typeof password !== "string" ||
        !password.trim() ||
        Array.from(password).length < 12 ||
        Buffer.byteLength(password, "utf8") > 72
    ) {
        throw new AdminProvisioningError(
            "INVALID_PASSWORD",
            "An explicit ADMIN_PASSWORD is required (at least 12 characters and at most 72 UTF-8 bytes).",
        );
    }
    return { userId: userId.trim(), password };
}

function existingAdministrator() {
    return new AdminProvisioningError(
        "ADMIN_EXISTS",
        "This administrator already exists, credentials have not been changed.",
    );
}

export async function provisionAdmin(input) {
    const credentials = validateAdminCredentials(input);
    // Also enforce the schema's existing unique index when autoIndex is disabled
    await Admin.createIndexes();
    if (await Admin.exists({ userId: credentials.userId })) throw existingAdministrator();

    try {
        // Use the model save hook so credentials are hashed exactly as for login
        const admin = await Admin.create(credentials);
        return { id: admin._id.toString(), userId: admin.userId };
    } catch (error) {
        if (error.code === 11000) throw existingAdministrator();
        throw error;
    }
}
