import { Router } from "express";

import EventController from "./event.controller.js";
import isAuthenticated from "../../middleware/isAuthenticated.js";

const router = Router();

router.use(isAuthenticated);
router.get("/examdates", EventController.GetExamDates);
export default router;
