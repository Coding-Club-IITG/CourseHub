import isLibraryAuthenticated from "../../middleware/isLibraryAuthenticated.js";
import express from "express";
import { addYear, deleteYear } from "./year.controller.js";
import { isBR } from "../../middleware/isBR.js";

const router = express.Router();
router.use(isLibraryAuthenticated);

router.post("", isBR, addYear);
router.delete("/delete", isBR, deleteYear);

export default router;
