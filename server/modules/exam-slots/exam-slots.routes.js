import express from 'express';
import { createOrUpdateExamSlot, getExamSlot } from './exam-slots.controller.js';

const router = express.Router();

router.post('/update', createOrUpdateExamSlot);
router.get('/:course/:branch/:semester', getExamSlot);

export default router;
