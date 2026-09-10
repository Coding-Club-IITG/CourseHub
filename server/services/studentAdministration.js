import User from "../modules/user/user.model.js";
import BR from "../modules/br/br.model.js";
import AppError from "../utils/appError.js";
import { escapeSearch, listParameters, pageFacet, pageResult } from "../utils/pagination.js";
const emailLower = (field) => ({ $toLower: { $ifNull: [field, ""] } });
const brLookup = {
    $lookup: {
        from: BR.collection.name,
        let: { email: emailLower("$email") },
        pipeline: [
            { $match: { $expr: { $eq: [emailLower("$email"), "$$email"] } } },
            { $limit: 1 },
            { $project: { _id: 1 } },
        ],
        as: "registry",
    },
};
const listProjection = {
    _id: 1,
    name: 1,
    email: 1,
    rollNumber: 1,
    degree: 1,
    department: 1,
    semester: 1,
    courseSync: 1,
    isBR: { $gt: [{ $size: "$registry" }, 0] },
    isRegistered: { $literal: true },
    courseCount: { $size: { $ifNull: ["$courses", []] } },
};
export async function listStudents(query, { brOnly = false } = {}) {
    const parameters = listParameters(query);
    if (query.isBR !== undefined && !["true", "false"].includes(query.isBR))
        throw new AppError(400, "isBR must be true or false", "INVALID_FILTER");
    brOnly = brOnly || query.isBR === "true";
    const pipeline = brOnly
        ? [
              {
                  $lookup: {
                      from: User.collection.name,
                      let: { email: emailLower("$email") },
                      pipeline: [
                          { $match: { $expr: { $eq: [emailLower("$email"), "$$email"] } } },
                          {
                              $project: {
                                  ...listProjection,
                                  isBR: { $literal: true },
                                  isRegistered: { $literal: true },
                              },
                          },
                          { $limit: 1 },
                      ],
                      as: "users",
                  },
              },
              { $set: { user: { $ifNull: [{ $arrayElemAt: ["$users", 0] }, null] } } },
              {
                  $project: {
                      _id: { $ifNull: ["$user._id", "$_id"] },
                      brId: "$_id",
                      email: 1,
                      name: { $ifNull: ["$user.name", "Pending registration"] },
                      rollNumber: { $ifNull: ["$user.rollNumber", "PENDING"] },
                      degree: { $ifNull: ["$user.degree", ""] },
                      department: { $ifNull: ["$user.department", ""] },
                      semester: { $ifNull: ["$user.semester", null] },
                      isBR: { $literal: true },
                      isRegistered: { $ne: ["$user", null] },
                      courseCount: { $ifNull: ["$user.courseCount", 0] },
                      courseSync: "$user.courseSync",
                  },
              },
          ]
        : [brLookup, { $project: listProjection }];
    if (parameters.q) {
        const literal = escapeSearch(parameters.q);
        pipeline.push({
            $match: {
                $or: [
                    { name: { $regex: literal, $options: "i" } },
                    { email: { $regex: literal, $options: "i" } },
                    {
                        $expr: {
                            $regexMatch: {
                                input: { $toString: "$rollNumber" },
                                regex: literal,
                                options: "i",
                            },
                        },
                    },
                ],
            },
        });
    }
    pipeline.push({ $sort: { isRegistered: -1, rollNumber: -1, _id: 1 } }, pageFacet(parameters));
    const [result] = await (brOnly ? BR : User).aggregate(pipeline);
    return pageResult(result, parameters);
}
export async function studentDetails(id) {
    const item = await User.findById(id)
        .select(
            "_id name email rollNumber semester degree department courses previousCourses readOnly courseSync",
        )
        .lean();
    if (!item) throw new AppError(404, "Student not found");
    item.isBR = !!(await BR.exists({ email: item.email }).collation({ locale: "en", strength: 2 }));
    item.isRegistered = true;
    return { item };
}
