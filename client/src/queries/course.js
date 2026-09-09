import { useQuery } from "@coursehub/browser";
import { normalizeCourseCode } from "@coursehub/domain";
import { useSession } from "../session/context";
import { library } from "../session/runtime";
import { getCourse } from "../api/Course";
export function useCourse(code) {
    const { data: actor } = useSession();
    const normalized = normalizeCourseCode(code);
    return useQuery({
        ...library.options("course", normalized, async ({ signal }) => {
            const data = await getCourse(normalized, signal);
            if (!data?.code || !Array.isArray(data.children))
                throw new Error("The course could not be read. Please try again.");
            return data;
        }),
        enabled: !!actor && !!normalized,
    });
}
