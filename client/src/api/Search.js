import { transport } from "./http";

export const GetSearchResult = (words) =>
    transport.json("search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ words }),
    });
