import express from "express";
import { createQuizEvent, getQuizEvents,deleteQuizEvent,modifyQuizEvent } from "./quizzes.controller.js";
import {isBR } from "../../middleware/isBR.js";

const router = express.Router();

// Create a new quiz event (BRs only)
router.post('/create', createQuizEvent);

// Get all quiz events
router.get('/events', getQuizEvents);
router.delete('/delete/:eventId', deleteQuizEvent);
router.put('/modify/:eventId', modifyQuizEvent);

export default router;
