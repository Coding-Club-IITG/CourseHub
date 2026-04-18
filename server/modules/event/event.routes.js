import { Router } from "express";
import catchAsync from "../../utils/catchAsync.js";
import EventController from "./event.controller.js";
import isAuthenticated from "../../middleware/isAuthenticated.js";

const router = Router();

router.get("/examdates", isAuthenticated, catchAsync(EventController.GetExamDates));
router.post("/create", catchAsync(EventController.CreateEvent));
export default router;
