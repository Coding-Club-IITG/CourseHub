export const LoginUser = (data) => {
    return {
        type: "LOG_IN",
        payload: {
            user: data,
        },
    };
};

export const LogoutUser = () => {
    return {
        type: "LOG_OUT",
    };
};
export const UpdateFavourites = (favourites) => {
    return {
        type: "UPDATE_FAVOURITES",
        payload: {
            favourites: favourites,
        },
    };
};

export const AddNewCourseLocal = (course) => {
    return {
        type: "ADD_COURSE_LOCAL",
        payload: {
            course: course,
        },
    };
};
export const LoadLocalCourses = (courses) => {
    return {
        type: "LOAD_LOCAL_COURSES",
        payload: {
            courses: courses,
        },
    };
};
export const UpdateUserAction = (newUserData) => {
    return {
        type: "UPDATE_USER",
        payload: {
            newUserData,
        },
    };
};

export const ClearLocalCourses = () => {
    return {
        type: "CLEAR_LOCAL_COURSES",
    };
};

export const UpdateReadOnlyCourses = (readOnly) => {
    return {
        type: "UPDATE_READONLY_COURSES",
        payload: {
            readOnly,
        },
    };
};
