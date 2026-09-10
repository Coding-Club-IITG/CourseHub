import { transport } from "./http";

export const GetSearchResult = (words, signal) =>
    transport.json("search", {
        method: "POST",
        signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ words }),
    });
