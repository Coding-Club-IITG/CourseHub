import BR from "./br.model.js";
import User from "../user/user.model.js";
import { fetchCoursesForBr } from "../auth/auth.controller.js";
import logger from "../../utils/logger.js";
import CourseModel from "../course/course.model.js";

const normalizeEmail = (email) => email?.toString().trim().toLowerCase();

// Mirrors normalizeCourseCode (utils/course.js) as an aggregation expression: uppercase + strip spaces.
const normalizedCodeExpr = (field) => ({
    $replaceAll: {
        input: { $toUpper: { $ifNull: [field, ""] } },
        find: " ",
        replacement: "",
    },
});

const findUserByEmailInsensitive = async (email) => {
    if (!email) return null;
    return User.findOne({ email }).collation({ locale: "en", strength: 2 });
};

const updateBRs = async (req, res) => {
    try {
        const { emails } = req.body;

        if (!emails || emails.length === 0) {
            return res.status(400).json({ error: "emails are required" });
        }

        for (const { email } of emails) {
            const normalizedEmail = normalizeEmail(email);
            if (!normalizedEmail) continue;
            const user = await findUserByEmailInsensitive(normalizedEmail);

            if (user) {
                if (!user.isBR) {
                    user.isBR = true;
                    fetchCoursesForBr(user.rollNumber).catch((error) => logger.error("BR course refresh failed", { error, attributes: { dependency: "academic-portal", operation: "refresh-br-courses", outcome: "failure", retryable: true } }));
                    await user.save();
                }
                await BR.updateOne(
                    { email: normalizedEmail },
                    { $set: { email: normalizedEmail } },
                    { upsert: true }
                );
            } else {
                await BR.updateOne(
                    { email: normalizedEmail },
                    { $set: { email: normalizedEmail } },
                    { upsert: true }
                );
            }
        }

        res.status(201).json({ message: "BRs updated successfully" });
    } catch (error) {
        logger.error("BR update failed", { error, attributes: { dependency: "mongodb", operation: "update-br", outcome: "failure", retryable: false } });
        res.status(500).json({ error: "Internal Server Error" });
    }
};

const createBR = async (req, res) => {
    try {
        const normalizedEmail = normalizeEmail(req.body?.email);

        if (!normalizedEmail) return res.status(400).json({ error: "email is required" });

        const exists = await BR.findOne({ email: normalizedEmail });
        if (exists) return res.status(409).json({ error: "BR already exists" });

        const user = await findUserByEmailInsensitive(normalizedEmail);
        if (user) {
            if (!user.isBR) {
                user.isBR = true;
                await user.save();
            }
            fetchCoursesForBr(user.rollNumber).catch((error) => logger.error("BR course refresh failed", { error, attributes: { dependency: "academic-portal", operation: "refresh-br-courses", outcome: "failure", retryable: true } }));
        }

        const br = await BR.create({ email: normalizedEmail });
        res.status(201).json({ message: "BR added", br });
    } catch (error) {
        logger.error("BR creation failed", { error, attributes: { dependency: "mongodb", operation: "create-br", outcome: "failure", retryable: false } });
        res.status(500).json({ error: "Internal Server Error" });
    }
};

const getAll = async (req, res, next) => {
    try {
        const list = await BR.find({});
        res.status(200).json({ list });
    } catch (err) {
        next(err);
    }
};

const deleteBR = async (req, res) => {
    try {
        const normalizedEmail = normalizeEmail(req.body?.email);
        if (!normalizedEmail) return res.status(400).json({ error: "email is required" });

        const br = await BR.findOneAndDelete({ email: normalizedEmail });
        if (!br) return res.status(404).json({ error: "BR not found" });
        await User.updateOne(
            { email: normalizedEmail },
            { $set: { isBR: false } },
            { collation: { locale: "en", strength: 2 } }
        );

        res.status(200).json({ message: "BR deleted successfully" });
    } catch (error) {
        logger.error("BR deletion failed", { error, attributes: { dependency: "mongodb", operation: "delete-br", outcome: "failure", retryable: false } });
        res.status(500).json({ error: "Internal Server Error" });
    }
};

const getBRs = async (req, res) => {
    try {
        // Fetch the definitive list of BRs from the BR collection
        const brRecords = await BR.find({});
        const brEmails = brRecords.map((br) => br.email);

        // Fetch user details for those who have registered
        const users = await User.find({ email: { $in: brEmails } });
        
        // Map users by email for quick lookup
        const userMap = {};
        for (const user of users) {
            userMap[user.email.toLowerCase()] = user;
        }

        // Construct the final list
        const brs = brRecords.map((br) => {
            const user = userMap[br.email.toLowerCase()];
            if (user) {
                return {
                    _id: user._id,
                    email: user.email,
                    name: user.name || "N/A",
                    degree: user.degree || "N/A",
                    department: user.department || "N/A",
                    semester: user.semester || "N/A",
                    rollNumber: user.rollNumber,
                    isBR: true,
                    courses: user.courses || [],
                }
            }
            return {
                email: br.email,
                name: "Pending Registration",
                degree: "N/A",
                department: "N/A",
                semester: "N/A",
                _id: br._id,
                rollNumber: "PENDING",
                isBR: true,
                courses: [],
            };
        });

        res.status(200).json({ brs });
    } catch (error) {
        logger.error("BR query failed", { error, attributes: { dependency: "mongodb", operation: "query-br", outcome: "failure", retryable: false } });
        res.status(500).json({ error: "Internal Server Error" });
    }
};
const getCoursesWithoutBR = async (req, res) => {
    try {
        // Normalized course codes covered by any registered BR, computed in the DB via a $lookup join.
        const coveredCodesResult = await BR.aggregate([
            { $addFields: { emailLower: { $toLower: "$email" } } },
            {
                $lookup: {
                    from: User.collection.name,
                    let: { emailLower: "$emailLower" },
                    pipeline: [
                        { $match: { $expr: { $eq: [{ $toLower: "$email" }, "$$emailLower"] } } },
                        { $project: { courses: 1, _id: 0 } },
                    ],
                    as: "brUser",
                },
            },
            { $unwind: "$brUser" },
            { $unwind: { path: "$brUser.courses", preserveNullAndEmptyArrays: false } },
            {
                $group: {
                    _id: null,
                    codes: { $addToSet: normalizedCodeExpr("$brUser.courses.code") },
                },
            },
        ]);

        const coveredCodes = coveredCodesResult[0]?.codes || [];

        // Courses whose normalized code isn't in the covered set, filtered at the DB level.
        const coursesWithoutBR = await CourseModel.aggregate([
            { $addFields: { normalizedCode: normalizedCodeExpr("$code") } },
            { $match: { normalizedCode: { $nin: coveredCodes } } },
            { $project: { normalizedCode: 0 } },
        ]);

        res.status(200).json({ coursesWithoutBR });
    } catch (error) {
        logger.error("Unassigned course query failed", { error, attributes: { dependency: "mongodb", operation: "query-unassigned-courses", outcome: "failure", retryable: false } });
        res.status(500).json({ error: "Internal Server Error" });
    }
};
export { updateBRs, createBR, getAll, deleteBR, getBRs, getCoursesWithoutBR };
