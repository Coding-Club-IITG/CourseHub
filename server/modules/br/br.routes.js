import express from "express";
import { updateBRs, createBR, getAll, deleteBR, getBRs, getCoursesWithoutBR } from "./br.controller.js";
import isAdmin from "../../middleware/isAdmin.js"
const router = express.Router();

router.post("/updateList",isAdmin, updateBRs);
router.post("/create", isAdmin,createBR);
router.get("/all",isAdmin, getAll);
router.get("/allBRs",isAdmin, getBRs);
router.get("/coursesWithoutBR",isAdmin, getCoursesWithoutBR);
router.delete("/delete",isAdmin, deleteBR);

export default router;
