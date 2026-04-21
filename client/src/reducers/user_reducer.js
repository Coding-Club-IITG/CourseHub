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
        case "ADD_COURSE_LOCAL":
            if (
                state.user?.courses?.find(
                    (course) =>
                        course.code.toLowerCase() === action.payload.course.code.toLowerCase()
                )
            )
                return state;
            if (
                state.user?.previousCourses?.flatMap((sem) => sem.courses)?.find(
                    (course) =>
                        course.code.toLowerCase() === action.payload.course.code.toLowerCase()
                )
            )
                return state;
            if (
                state.user?.readOnly?.find(
                    (course) =>
                        course.code.toLowerCase() === action.payload.course.code.toLowerCase()
                )
            )
                return state;
            if (state.localCourses?.find((course) => course.code === action.payload.course.code))
                return state;
            upsertLocalCourseCache(action.payload.course);
            return { ...state, localCourses: [...state.localCourses, action.payload.course] };
        case "LOAD_LOCAL_COURSES":
            return { ...state, localCourses: [...state.localCourses, ...action.payload.courses] };
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
