import catchAsync from "../../utils/catchAsync.js";
import isAdmin from "../../middleware/isAdmin.js";
import express from "express";
import {
    updateBRs,
    createBR,
    getAll,
    deleteBR,
    getBRs,
    getCoursesWithoutBR,
} from "./br.controller.js";
const router = express.Router();
router.use(isAdmin);

router.post("/updateList", catchAsync(updateBRs));
router.post("/create", catchAsync(createBR));
router.get("/all", catchAsync(getAll));
router.get("/allBRs", catchAsync(getBRs));
router.get("/coursesWithoutBR", catchAsync(getCoursesWithoutBR));
router.delete("/delete", catchAsync(deleteBR));

export default router;
