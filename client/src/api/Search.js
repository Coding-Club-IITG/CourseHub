import axios from "axios";
import serverRoot from "./server";

export const GetSearchResult = async (wordArr) => {
    const fetched = await axios.post(`${serverRoot}/api/search`, {
        words: wordArr,
    });
    return fetched;
};
