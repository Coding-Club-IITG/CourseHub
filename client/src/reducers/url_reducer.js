const url_reducer = (
    state = {
        previewUrls: [{ id: "test", url: "test" }],
        downloadUrls: [{ id: "test", url: "test" }],
    },
    action,
) => {
    switch (action.type) {
        case "ADD_PREVIEW_URL":
            if (state.previewUrls.find((data) => data.id === action.payload.id)) return state;
            return {
                ...state,
                previewUrls: [
                    ...state.previewUrls,
                    { id: action.payload.id, url: action.payload.url },
                ],
            };
        case "ADD_DOWNLOAD_URL":
            if (state.downloadUrls.find((data) => data.id === action.payload.id)) return state;
            return {
                ...state,
                downloadUrls: [
                    ...state.downloadUrls,
                    { id: action.payload.id, url: action.payload.url },
                ],
            };
        default:
            return state;
    }
};

export default url_reducer;
