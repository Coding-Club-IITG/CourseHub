import mongoose from "../../config/mongoose.js";
const SearchSchema = mongoose.Schema({
    name: { type: String, required: true },
    code: { type: String, required: true, unique: true },
    isAvailable: { type: Boolean, default: false },
});

SearchSchema.statics.getSearchResults = async function (wordArr) {
    try {
        let words = wordArr.map((word) => word.toLowerCase());
        const SearchResult = this;
        const agg = await SearchResult.aggregate([
            { $match: {} },
            { $project: { name: true, code: true, isAvailable: true } },
            {
                $project: {
                    name: { $toLower: "$name" },
                    code: { $toLower: "$code" },
                    isAvailable: true,
                },
            },

            {
                $project: {
                    name: true,
                    code: true,
                    isAvailable: true,
                    wordArray: { $split: ["$name", " "] },
                    code: {
                        $replaceAll: {
                            input: "$code",
                            find: " ",
                            replacement: "",
                        },
                    },
                },
            },
            {
                $project: {
                    name: true,
                    code: true,
                    isAvailable: true,
                    numberOfWordsMatched: {
                        $size: {
                            $setIntersection: ["$wordArray", words],
                        },
                    },
                },
            },
            {
                $project: {
                    name: true,
                    code: true,
                    isAvailable: true,
                    numberOfWordsMatched: true,
                    codeMatch: {
                        $size: {
                            $setIntersection: [["$code"], words],
                        },
                    },
                },
            },
            {
                $sort: {
                    codeMatch: -1,
                    numberOfWordsMatched: -1,
                },
            },
            { $limit: 3 },
        ]);
        return agg;
    } catch (error) {
        return [];
    }
};

const SearchResults = mongoose.model("SearchResults", SearchSchema);
export default SearchResults;
