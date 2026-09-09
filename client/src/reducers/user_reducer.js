import { normalizeCourseCode } from "@coursehub/domain";
import { upsertLocalCourseCache } from "../utils/frontendCache";

const UserReducer = (
    state = {
        loggedIn: false,
        user: {},
        localCourses: [],
        favourites: [],
    },
    action,
) => {
    switch (action.type) {
        case "LOG_IN":
            return {
                ...state,
                loggedIn: true,
                user: { ...state.user, ...action.payload.user },
                favourites: action.payload.user?.favourites ?? state.favourites ?? [],
            };
        case "UPDATE_READONLY_COURSES":
            return {
                ...state,
                user: {
                    ...state.user,
                    readOnly: action.payload.readOnly,
                },
            };
        case "LOG_OUT":
            return { ...state, loggedIn: false, user: {}, favourites: [], localCourses: [] };
        case "UPDATE_FAVOURITES":
            return { ...state, favourites: action.payload.favourites };
        case "ADD_COURSE_LOCAL": {
            const incomingCode = normalizeCourseCode(action.payload.course?.code);
            if (!incomingCode) return state;

            const matchesIncoming = (c) => normalizeCourseCode(c?.code) === incomingCode;

            if (state.user?.courses?.some(matchesIncoming)) return state;
            if (
                state.user?.previousCourses
                    ?.flatMap((sem) => sem.courses || [])
                    .some(matchesIncoming)
            )
                return state;
            if (state.user?.readOnly?.some(matchesIncoming)) return state;
            if (state.localCourses?.some(matchesIncoming)) return state;

            const shortcut = {
                code: action.payload.course.code,
                name: action.payload.course.name,
                color: action.payload.course.color,
            };
            upsertLocalCourseCache(shortcut);
            return { ...state, localCourses: [...state.localCourses, shortcut] };
        }
        case "LOAD_LOCAL_COURSES": {
            const existingCodes = new Set(
                (state.localCourses || []).map((c) => normalizeCourseCode(c?.code)),
            );
            const newUnique = (action.payload.courses || []).filter(
                (c) => c?.code && !existingCodes.has(normalizeCourseCode(c.code)),
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
            return state;
        default:
            return state;
    }
};

export default UserReducer;
