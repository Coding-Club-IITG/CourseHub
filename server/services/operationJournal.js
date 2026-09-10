import { OperationModel } from "../modules/operation/operation.model.js";
import { releaseCourseLocks } from "./courseLocks.js";
import AppError from "../utils/appError.js";

export function journalStep(operation, checkpoint) {
    return async (key, action) => {
        await checkpoint();
        const current = await OperationModel.findById(operation._id)
            .select("completedSteps")
            .lean();
        if (current.completedSteps.includes(key)) return;
        await action();
        await checkpoint();
        const saved = await OperationModel.updateOne(
            { _id: operation._id, leaseToken: operation.leaseToken },
            { $addToSet: { completedSteps: key } },
        );
        if (!saved.matchedCount) throw new AppError(409, "Operation lease was lost", "LEASE_LOST");
    };
}

export async function completeOperation(operation, checkpoint) {
    await checkpoint();
    const finished = await OperationModel.updateOne(
        { _id: operation._id, leaseToken: operation.leaseToken },
        {
            $set: { status: "completed" },
            $unset: {
                error: 1,
                leaseUntil: 1,
                leaseToken: 1,
                ...(["link", "rename", "academic-sync"].includes(operation.kind)
                    ? { requestKey: 1, syncKey: 1 }
                    : {}),
            },
        },
    );
    if (!finished.modifiedCount) throw new AppError(409, "Operation lease was lost", "LEASE_LOST");
    await releaseCourseLocks(operation._id);
}
