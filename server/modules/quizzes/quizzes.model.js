import mongoose from "mongoose";

const quizEventSchema = new mongoose.Schema({
    eventName: {
        type: String,
        required: true,
        trim: true
    },
    eventDate: {
        type: Date,
        required: true
    },
    course: {
        type: String,
        required: true,
        trim: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const QuizEvent = mongoose.model('QuizEvent', quizEventSchema);
export default QuizEvent;

import mongoose from "mongoose";

const quizEventSchema = new mongoose.Schema({
    eventName: {
        type: String,
        required: true,
        trim: true
    },
    eventDate: {
        type: Date,
        required: true
    },
    course: {
        type: String,
        required: true,
        trim: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const QuizEvent = mongoose.model('QuizEvent', quizEventSchema);
export default QuizEvent;
