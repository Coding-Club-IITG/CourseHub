import { writeAllCoursesCache } from "../utils/frontendCache";

const persistAllCourses = (courses) => {
    writeAllCoursesCache(courses);
    return courses;
};

const replaceFolderInTree = (nodes, targetFolder) => {
    if (!Array.isArray(nodes) || !targetFolder?._id) return nodes;

    let changed = false;
    const nextNodes = nodes.map((node) => {
        if (!node || typeof node !== "object") return node;

        if (node._id === targetFolder._id) {
            changed = true;
            return targetFolder;
        }

        if (Array.isArray(node.children) && node.children.length > 0) {
            const nextChildren = replaceFolderInTree(node.children, targetFolder);
            if (nextChildren !== node.children) {
                changed = true;
                return { ...node, children: nextChildren };
            }
        }

        return node;
    });

    return changed ? nextNodes : nodes;
};

const syncFolderIntoCourseCache = (state, folder) => {
    if (!folder?._id || !state.currentCourseCode) {
        return {
            allCourseData: state.allCourseData,
            currentCourse: state.currentCourse,
            currentYearFolderStructure: state.currentYearFolderStructure,
        };
    }

    const nextAllCourseData = Array.isArray(state.allCourseData)
        ? state.allCourseData.map((course) => {
              if (
                  !course?.code ||
                  course.code.toLowerCase() !== state.currentCourseCode.toLowerCase()
              ) {
                  return course;
              }
              const nextChildren = replaceFolderInTree(course.children || [], folder);
              if (nextChildren === course.children) return course;
              return { ...course, children: nextChildren };
          })
        : state.allCourseData;

    const nextCurrentCourse = Array.isArray(state.currentCourse)
        ? replaceFolderInTree(state.currentCourse, folder)
        : state.currentCourse;

    let nextCurrentYearFolderStructure = state.currentYearFolderStructure;

    const activeYearFolder =
        Array.isArray(nextCurrentCourse) &&
        state.currentYear !== null &&
        state.currentYear !== undefined
            ? nextCurrentCourse[state.currentYear]
            : null;

    if (activeYearFolder?._id === folder._id) {
        nextCurrentYearFolderStructure = Array.isArray(folder.children) ? folder.children : [];
    } else if (Array.isArray(state.currentYearFolderStructure)) {
        nextCurrentYearFolderStructure = replaceFolderInTree(
            state.currentYearFolderStructure,
            folder
        );
    }

    return {
        allCourseData: nextAllCourseData,
        currentCourse: nextCurrentCourse,
        currentYearFolderStructure: nextCurrentYearFolderStructure,
    };
};

const FileBrowserReducer = (
    state = {
        currentCourse: null,
        currentCourseCode: null,
        currentFolder: null,
        currentYear: null,
        currentYearFolderStructure: [],
        allCourseData: [],
        folderHistory: [], // Add folder navigation history
    },
    action
) => {
    switch (action.type) {
        case "LOAD_COURSES":
            return { ...state, allCourseData: action.payload.allCourseData };
        case "CHANGE_CURRENT_COURSE":

            return {
                ...state,
                currentCourse: action.payload.currentCourse,
                currentCourseCode: action.payload.currentCourseCode,
            };
        case "UPDATE_COURSES":
            let arr = Array.isArray(state.allCourseData) ? [...state.allCourseData] : [];
            const incomingCourse = action.payload.currentCourse;
            const incomingCode = incomingCourse?.code?.toLowerCase();
            if (!incomingCode) {
                return state;
            }

            const existingCourse = arr.find((course) => course.code?.toLowerCase() === incomingCode);
            const existingHasTree =
                Array.isArray(existingCourse?.children) && existingCourse.children.length > 0;
            const incomingHasTree =
                Array.isArray(incomingCourse?.children) && incomingCourse.children.length > 0;

            const nextCourse = existingHasTree && !incomingHasTree ? existingCourse : incomingCourse;

            arr = arr.filter((course) => course.code?.toLowerCase() !== incomingCode);
            arr.push(nextCourse);
            persistAllCourses(arr);
            return {
                ...state,
                allCourseData: [...arr],
            };
        case "CHANGE_CURRENT_FOLDER":
            if (!action.payload.currentFolder) {
                return { ...state, currentFolder: null };
            }

            const syncedState = syncFolderIntoCourseCache(state, action.payload.currentFolder);
            if (syncedState.allCourseData !== state.allCourseData) {
                persistAllCourses(syncedState.allCourseData);
            }

            return {
                ...state,
                currentFolder: action.payload.currentFolder,
                allCourseData: syncedState.allCourseData,
                currentCourse: syncedState.currentCourse,
                currentYearFolderStructure: syncedState.currentYearFolderStructure,
            };
        case "CHANGE_CURRENT_YEAR_DATA":
            return {
                ...state,
                currentYear: action.payload.currentYear,
                currentYearFolderStructure: [...action.payload.currentYearFolderStructure],
            };
        case "RESET_FILE_BROWSER_STATE":
            return {
                ...state,
                currentCourse: null,
                currentCourseCode: null,
                currentFolder: null,
                currentYear: null,
            };
        case "UPDATE_FILE_VERIFICATION_STATUS":
            const verifiedFolder = {
                ...state.currentFolder,
                children: state.currentFolder.children.map((file) =>
                    file._id === action.payload.fileId
                        ? { ...file, isVerified: action.payload.status }
                        : file
                ),
            };
            const verifiedSyncedState = syncFolderIntoCourseCache(state, verifiedFolder);
            if (verifiedSyncedState.allCourseData !== state.allCourseData) {
                persistAllCourses(verifiedSyncedState.allCourseData);
            }

            return {
                ...state,
                currentFolder: verifiedFolder,
                allCourseData: verifiedSyncedState.allCourseData,
                currentCourse: verifiedSyncedState.currentCourse,
                currentYearFolderStructure: verifiedSyncedState.currentYearFolderStructure,
            };
        case "REMOVE_FILE_FROM_FOLDER":
            const folderAfterFileRemoval = {
                ...state.currentFolder,
                children: state.currentFolder.children.filter(
                    (file) => file._id !== action.payload
                ),
            };
            const fileRemovedSyncedState = syncFolderIntoCourseCache(state, folderAfterFileRemoval);
            if (fileRemovedSyncedState.allCourseData !== state.allCourseData) {
                persistAllCourses(fileRemovedSyncedState.allCourseData);
            }

            return {
                ...state,
                currentFolder: folderAfterFileRemoval,
                allCourseData: fileRemovedSyncedState.allCourseData,
                currentCourse: fileRemovedSyncedState.currentCourse,
                currentYearFolderStructure: fileRemovedSyncedState.currentYearFolderStructure,
            };

        case "REFRESH_CURRENT_FOLDER":
            return {
                ...state,
                refreshKey: action.payload,
            };

        case "PUSH_FOLDER_HISTORY":
            return {
                ...state,
                folderHistory: [...state.folderHistory, action.payload],
            };

        case "POP_FOLDER_HISTORY":
            const newHistory = [...state.folderHistory];
            const previousFolder = newHistory.pop();
            return {
                ...state,
                folderHistory: newHistory,
                currentFolder: previousFolder || null,
            };

        case "CLEAR_FOLDER_HISTORY":
            return {
                ...state,
                folderHistory: [],
            };

        default:
            return state;
    }
};

export default FileBrowserReducer;
