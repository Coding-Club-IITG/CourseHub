import { useQuery } from "@coursehub/browser";
import { useSession } from "../session/context";
import { GetExamSchedule } from "../api/User";

export function useExamSchedule() {
    const actor = useSession().data;
    return useQuery({
        queryKey: ["exam-schedule", actor?._id, actor?.courseSync?.lastSucceededAt || null],
        enabled: !!actor?._id,
        staleTime: 0,
        refetchInterval: (query) =>
            Math.max(1000, Math.min(60_000, query.state.data?.refreshAfterMs || 60_000)),
        queryFn: async ({ signal }) => {
            await Promise.resolve();
            signal.throwIfAborted();
            const data = await GetExamSchedule(signal);
            if (
                !data?.period?.year ||
                !data.period.session ||
                data.timeZone !== "Asia/Kolkata" ||
                !["ready", "unavailable", "excluded"].includes(data.status) ||
                (data.status === "ready" &&
                    ["midSem", "endSem"].some(
                        (type) =>
                            !["scheduled", "partial", "unavailable", "none", "complete"].includes(
                                data.exams?.[type]?.status,
                            ) ||
                            !Array.isArray(data.exams[type].items) ||
                            !Array.isArray(data.exams[type].missingCourses),
                    ))
            )
                throw new Error("The exam schedule could not be read. Please try again.");
            return data;
        },
    });
}
