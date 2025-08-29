import express from 'express';
import ExamSlotModel from './exam-slots.model.js';

//check if exam slot exists, if it does edit it, if not create it
export const createOrUpdateExamSlot = async (req, res) => {
    try {
        const {course} = req.body;
        const { branch } = req.body;
        const {semester} = req.body;
        let examSlot = await ExamSlotModel.findOne({course, branch, semester });
        if (examSlot) {
            //update
            examSlot = await ExamSlotModel.findOneAndUpdate(
                {course, branch, semester },
                { $set: req.body });
            return res.status(200).json({ message: 'Exam slot updated successfully', examSlot });
        } else {
            //create
            examSlot = new ExamSlotModel(req.body);
            await examSlot.save();
            return res.status(201).json({ message: 'Exam slot created successfully', examSlot });
        }
    } catch (error) {
        console.error('Error in createOrUpdateExamSlot:', error);
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
};

export const getExamSlot = async (req, res) => {
    try {
        const {course, branch, semester } = req.params;
        const examSlot = await ExamSlotModel.findOne({course, branch, semester });
        if (!examSlot) {
            return res.status(404).json({ message: 'Exam slot not found' });
        }
        return res.status(200).json(examSlot);
    } catch (error) {
        console.error('Error in getExamSlot:', error);
        return res.status(500).json({ message: 'Server error', error: error.message });
    }   
};

export default {
    createOrUpdateExamSlot,
    getExamSlot
}