import { upsertLocalCourseCache, clearLocalCoursesCache } from "../utils/frontendCache";

const UserReducer = (
    state = {
        loggedIn: false,
        user: {},
        localCourses: [
        ],
        favourites: [],
    },
    action
) => {
    switch (action.type) {
        case "LOG_IN":
            return {
                ...state,
                loggedIn: true,
                user: action.payload.user,
                favourites: action.payload.user.favourites,
            };
        case "LOG_OUT":
            return { ...state, loggedIn: false };
        case "UPDATE_FAVOURITES":
            return { ...state, favourites: action.payload.favourites };
        case "ADD_COURSE_LOCAL": {
            const incomingCode = action.payload.course?.code?.toString()?.replace(/\s+/g, "")?.toLowerCase();
            if (!incomingCode) return state;

            const matchesIncoming = (c) => c?.code?.toString()?.replace(/\s+/g, "")?.toLowerCase() === incomingCode;

            if (state.user?.courses?.some(matchesIncoming)) return state;
            if (state.user?.previousCourses?.flatMap((sem) => sem.courses || []).some(matchesIncoming)) return state;
            if (state.user?.readOnly?.some(matchesIncoming)) return state;
            if (state.localCourses?.some(matchesIncoming)) return state;

            upsertLocalCourseCache(action.payload.course);
            return { ...state, localCourses: [...state.localCourses, action.payload.course] };
        }
        case "LOAD_LOCAL_COURSES": {
            const existingCodes = new Set(
                (state.localCourses || []).map((c) => c?.code?.toString()?.replace(/\s+/g, "")?.toLowerCase())
            );
            const newUnique = (action.payload.courses || []).filter(
                (c) => c?.code && !existingCodes.has(c.code.toString().replace(/\s+/g, "").toLowerCase())
            );
            return { ...state, localCourses: [...state.localCourses, ...newUnique] };
        }
        case "CLEAR_LOCAL_COURSES":
            return { ...state, localCourses: [] };
        case "UPDATE_USER":
            if (action.payload.newUserData.newUserName) {
                return {
                    ...state,
                    user: { ...state.user, name: action.payload.newUserData.newUserName },
                };
            } else if (action.payload.newUserData.newUserSem) {
                return {
                    ...state,
                    user: { ...state.user, semester: action.payload.newUserData.newUserSem },
                };
            }
        default:
            return state;
    }
};

export default UserReducer;
