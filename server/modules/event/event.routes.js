import { Router } from "express";
import catchAsync from "../../utils/catchAsync.js";
import EventController from "./event.controller.js";
import isAuthenticated from "../../middleware/isAuthenticated.js";

const router = Router();

router.use(isAuthenticated);
router.get("/examdates", catchAsync(EventController.GetExamDates));
export default router;
