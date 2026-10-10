import { Router } from "express";
import catchAsync from "../../utils/catchAsync.js";
import EventController from "./event.controller.js";
import isAuthenticated from "../../middleware/isAuthenticated.js";
import isAdmin from "../../middleware/isAdmin.js";

const router = Router();

router.get("/examdates", isAuthenticated, catchAsync(EventController.GetExamDates));
router.get("/admin/examdates", isAdmin, catchAsync(EventController.GetAdminExamDates));
router.put("/admin/examdates", isAdmin, catchAsync(EventController.UpsertExamDates));
router.post("/create", catchAsync(EventController.CreateEvent));
export default router;
