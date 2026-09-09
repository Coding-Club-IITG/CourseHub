export function linkingOperation(status = "completed") {
    return {
        id: "a10a1010-1010-4010-a010-101010101010",
        kind: "link",
        status,
        courseCode: "CS201",
        name: "CS101 → CS201",
        affectedCourses: ["CS101", "CS201"],
        entries: [],
        completedSteps: status === "completed" ? 4 : 2,
        canCancel: false,
        canRetry: status === "failed",
        createdAt: "2026-09-09T06:30:00Z",
        updatedAt: "2026-09-09T06:30:00Z",
        ...(status === "failed"
            ? {
                  error: {
                      code: "OPERATION_FAILED",
                      message: "Linking could not finish. Retry preserves the saved plan.",
                  },
              }
            : {}),
        linking: {
            sourceCode: "CS101",
            targetCode: "CS201",
            linked: [{ year: "2025", id: "a10101010101010101010101" }],
            alreadyLinked: [{ year: "2024", id: "a10101010101010101010102" }],
            replaced: [{ year: "2025", id: "a10101010101010101010103" }],
            conflicts: [
                {
                    year: "2026",
                    reason: "The target has content in this year; its files and folders were preserved.",
                    sourceIds: ["a10101010101010101010104"],
                    targetIds: ["a10101010101010101010105", "a10101010101010101010106"],
                },
            ],
        },
    };
}
