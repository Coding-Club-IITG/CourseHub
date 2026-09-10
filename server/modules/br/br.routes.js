import isAdmin from "../../middleware/isAdmin.js";
import express from "express";
import { createBR, getAll, deleteBR, getBRs } from "./br.controller.js";
const router = express.Router();
router.use(isAdmin);

router.post("/create", createBR);
router.get("/all", getAll);
router.get("/allBRs", getBRs);
router.delete("/delete", deleteBR);

export default router;
