import isLibraryAuthenticated from "../../middleware/isLibraryAuthenticated.js";
import express from "express";
import { addYear, deleteYear } from "./year.controller.js";
import { isBR } from "../../middleware/isBR.js";

import catchAsync from "../../utils/catchAsync.js";
const router = express.Router();
router.use(isLibraryAuthenticated);

router.post("", isBR, catchAsync(addYear));
router.delete("/delete", isBR, catchAsync(deleteYear));

export default router;
