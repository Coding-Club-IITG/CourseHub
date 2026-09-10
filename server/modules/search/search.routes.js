import { Router } from "express";

import isLibraryAuthenticated from "../../middleware/isLibraryAuthenticated.js";
const router = Router();
router.use(isLibraryAuthenticated);
import CourseModel from "../course/course.model.js";

router.post("/", async (req, res, next) => {
    let { words } = req.body;
    const searchWords = words.map((w) => w.toLowerCase());
    const allCourses = await CourseModel.find().select("code name");

    const payload = allCourses
        .map((course) => {
            const matchCount = searchWords.reduce((acc, word) => {
                if (
                    course.code.toLowerCase().includes(word) ||
                    course.name.toLowerCase().includes(word)
                ) {
                    return acc + 1;
                }
                return acc;
            }, 0);
            return { code: course.code, name: course.name, matchCount };
        })
        .filter((course) => course.matchCount > 0)
        .sort((a, b) => b.matchCount - a.matchCount);

    return res.status(200).json({ found: payload.length > 0, results: payload });
});

export default router;
