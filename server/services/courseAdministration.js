import Course from "../modules/course/course.model.js";
import AppError from "../utils/appError.js";
import { listParameters, escapeSearch, pageFacet, pageResult } from "../utils/pagination.js";
// Match the whitespace removed by the environment-neutral course normalizer.
const normalizedCode = {
    $reduce: {
        input: {
            $regexFindAll: {
                input: { $toUpper: { $ifNull: ["$code", ""] } },
                regex: "[^\\s\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\ufeff]+",
            },
        },
        initialValue: "",
        in: { $concat: ["$$value", "$$this.match"] },
    },
};
export async function listCourses(query) {
    const parameters = listParameters(query);
    for (const key of ["nameless", "duplicates"])
        if (query[key] !== undefined && !["true", "false"].includes(query[key]))
            throw new AppError(400, `${key} must be true or false`, "INVALID_FILTER");
    const pipeline = [
        {
            $project: {
                _id: 1,
                code: 1,
                name: 1,
                changingOperation: 1,
                deletingOperation: 1,
                normalizedCode,
            },
        },
        { $group: { _id: "$normalizedCode", items: { $push: "$$ROOT" }, count: { $sum: 1 } } },
        { $unwind: "$items" },
        {
            $replaceRoot: {
                newRoot: { $mergeObjects: ["$items", { duplicate: { $gt: ["$count", 1] } }] },
            },
        },
    ];
    if (query.duplicates === "true") pipeline.push({ $match: { duplicate: true } });
    if (query.nameless === "true")
        pipeline.push({
            $match: { $or: [{ name: { $in: [null, "", "Name Unavailable"] } }, { name: /^\s*$/ }] },
        });
    if (parameters.q) {
        const literal = escapeSearch(parameters.q);
        pipeline.push({
            $match: {
                $or: [
                    { code: { $regex: literal, $options: "i" } },
                    { name: { $regex: literal, $options: "i" } },
                ],
            },
        });
    }
    pipeline.push(
        { $sort: { normalizedCode: 1, _id: 1 } },
        { $unset: "normalizedCode" },
        pageFacet(parameters),
    );
    return pageResult((await Course.aggregate(pipeline))[0], parameters);
}
