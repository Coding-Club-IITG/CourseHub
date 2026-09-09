import { folder } from "./library.js";

export function uploadOperation(status = "partial") {
    return {
        id: "88718faa-8b50-492e-ae06-0a332dcb808b",
        kind: "upload",
        name: "File upload",
        courseCode: "CS101",
        folderId: folder._id,
        affectedCourses: ["CS101"],
        status,
        canCancel: !["completed", "cancelled"].includes(status),
        canRetry: status === "partial",
        completedSteps: 0,
        createdAt: "2026-09-08T06:30:00Z",
        updatedAt: "2026-09-08T06:30:00Z",
        entries: [
            {
                id: "c0ddc5c4-a080-4c2c-8aa3-6ff47096caf3",
                name: "Lecture notes.pdf",
                size: 5,
                uploadedBytes: 5,
                state: "completed",
            },
            {
                id: "978915e6-2d0e-4345-bdd1-58f2b4c10f3e",
                name: "Tutorial solutions with additional worked examples.pdf",
                size: 5,
                uploadedBytes: 0,
                state:
                    status === "completed"
                        ? "completed"
                        : status === "cancelled"
                          ? "cancelled"
                          : "failed",
                error: {
                    message: "The storage service could not finish this file. Retry this file.",
                },
            },
        ],
    };
}

export function deletionOperation(status = "failed") {
    return {
        id: "99433f37-fb89-4cac-a4dc-d1a6f7619eb4",
        kind: "delete",
        name: "Shared lecture notes.pdf",
        courseCode: "CS101",
        affectedCourses: ["CS101", "MA101"],
        status,
        entries: [],
        completedSteps: status === "completed" ? 4 : 1,
        canRetry: status === "failed",
        canCancel: false,
        createdAt: "2026-09-08T06:30:00Z",
        updatedAt: "2026-09-08T06:30:00Z",
        error:
            status === "failed"
                ? {
                      code: "STORAGE_UNAVAILABLE",
                      message: "Thumbnail cleanup could not finish. Completed steps are preserved.",
                  }
                : undefined,
    };
}
