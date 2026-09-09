import { useQuery } from "@coursehub/browser";
import { RequestError } from "@coursehub/browser/react";
import { library } from "../session";
import CoursesWithoutBRTable from "../components/CoursesWithoutBRTable";
import { fetchCoursesWithoutBR } from "@/apis/br";

export default function CoursesWithoutBR() {
    const query = useQuery(
        library.options("without-br", "", async ({ signal }) => {
            const data = await fetchCoursesWithoutBR(signal);
            if (!Array.isArray(data.coursesWithoutBR))
                throw new Error("The course list could not be read. Please try again.");
            return data.coursesWithoutBR;
        }),
    );
    const courses = query.data || [],
        loading = query.isPending,
        error = query.error;

    return (
        <div className="p-6 space-y-6">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/60 p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Courses Without BR</h1>
                    <p className="text-gray-600 mt-1">
                        Courses that don't have a branch representative assigned yet
                    </p>
                </div>
            </div>

            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/60 p-6">
                {loading && <p>Loading...</p>}
                {error && <RequestError error={error} onRetry={query.refetch} />}
                {!loading && !error && <CoursesWithoutBRTable courses={courses} />}
            </div>
        </div>
    );
}
