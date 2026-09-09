import { model, Schema } from "mongoose";

const Entry = new Schema(
    {
        id: { type: String, required: true },
        name: { type: String, required: true },
        size: { type: Number, required: true },
        fileId: { type: Schema.Types.ObjectId, required: true },
        remoteName: { type: String, required: true },
        state: { type: String, default: "pending" },
        receivedAt: Date,
        receiveUntil: Date,
        receiveToken: String,
        temporaryName: String,
        sha256: String,
        sessionUrl: String,
        providerId: String,
        uploadedBytes: { type: Number, default: 0 },
        published: { type: Boolean, default: false },
        error: { code: String, message: String },
    },
    { _id: false },
);

const Operation = new Schema(
    {
        _id: { type: String, required: true },
        kind: { type: String, enum: ["upload", "delete", "link"], required: true },
        actorId: { type: Schema.Types.ObjectId, required: true },
        actorRole: { type: String, enum: ["student", "admin"], required: true },
        requestKey: String,
        status: {
            type: String,
            enum: [
                "planning",
                "awaiting",
                "queued",
                "running",
                "completed",
                "partial",
                "failed",
                "cancelling",
                "cancelled",
            ],
            default: "planning",
        },
        courses: [String],
        target: { type: Schema.Types.Mixed, required: true },
        plan: Schema.Types.Mixed,
        entries: [Entry],
        completedSteps: [String],
        cancelRequested: { type: Boolean, default: false },
        receivingCount: { type: Number, default: 0 },
        revision: { type: Number, default: 0 },
        attempts: { type: Number, default: 0 },
        nextRunAt: { type: Date, default: Date.now },
        leaseToken: String,
        leaseUntil: Date,
        error: { code: String, message: String },
    },
    { timestamps: true },
);
Operation.index(
    { actorId: 1, requestKey: 1 },
    { unique: true, partialFilterExpression: { requestKey: { $type: "string" } } },
);
Operation.index({ status: 1, nextRunAt: 1, leaseUntil: 1 });
Operation.index({ courses: 1, status: 1 });
export const OperationModel = model("Operation", Operation);

const Lock = new Schema(
    { _id: String, owner: { type: String, required: true }, expiresAt: Date },
    { timestamps: true },
);
export const CourseLock = model("CourseLock", Lock);
export const StorageLease = model("StorageLease", Lock.clone());
