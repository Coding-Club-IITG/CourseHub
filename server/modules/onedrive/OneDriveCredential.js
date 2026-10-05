import { model, Schema } from "mongoose";

export const ONEDRIVE_CREDENTIAL_ID = "onedrive";

const schema = new Schema(
    {
        _id: {
            type: String,
            required: true,
            enum: [ONEDRIVE_CREDENTIAL_ID],
            default: ONEDRIVE_CREDENTIAL_ID,
        },
        refreshToken: { type: String, required: true, select: false },
    },
    { timestamps: true },
);

export default model("OneDriveCredential", schema);
