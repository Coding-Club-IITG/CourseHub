import { usePagedList } from "../../queries/usePagedList";
import { fetchStudents } from "../../apis/student";
export const useStudents = () => usePagedList("students", fetchStudents, ["isBR"]);
