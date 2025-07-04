import axios from "axios";
import serverRoot from "./server";

export const GetSearchResult = async (wordArr) => {
    const fetched = await axios.post(`${serverRoot}/api/search`, {
        words: wordArr,
    });
    return fetched;
};

export const IsCourseAvailable = async (code) => {
    const fetched = await axios.post(`${serverRoot}/api/search/isavailable`, {
        code: code,
    });
    return fetched;
};
