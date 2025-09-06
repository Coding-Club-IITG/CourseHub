import express from "express";
import { addYear, deleteYear, editProfName } from "./year.controller.js";
import isAuthenticated from "../../middleware/isAuthenticated.js";
import { isBR } from "../../middleware/isBR.js";

const router = express.Router();

router.post("", isAuthenticated, isBR, addYear);
router.delete("/delete", isAuthenticated, isBR, deleteYear);
router.put("/edit-prof", isAuthenticated, isBR, editProfName);

export default router;
