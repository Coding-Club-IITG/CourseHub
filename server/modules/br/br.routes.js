import express from "express";
import { updateBRs, createBR, getAll, deleteBR, getBRs, getCoursesWithoutBR  } from "./br.controller.js";

const router = express.Router();

router.post("/updateList", updateBRs);
router.post("/create", createBR);
router.get("/all", getAll);
router.get("/allBRs", getBRs);
router.get("/coursesWithoutBR", getCoursesWithoutBR);
router.delete("/delete", deleteBR);

export default router;
