import quizEventModel from "./quizzes.model.js";

export const createQuizEvent = async (req, res) => {
    try {
        const {eventName, eventDate, course,courseName} = req.body;
        if(!eventName || !eventDate || !course){
            console.log("All fields are required");
            return res.status(400).json({message: "All fields are required", success: false});
        }
        
        const newQuizEvent = new quizEventModel({
            eventName,
            eventDate,
            course,
            // courseName
        });
        
        const savedEvent = await newQuizEvent.save();
        res.status(201).json({
            success: true,
            message: "Event Created Successfully",
            data: savedEvent,
        });
    } catch (error){
        console.log(error);
        res.status(500).json({
        success: false,
        message: "Error creating quiz event",
        error: error.message,
        });
    }
}
export const getQuizEvents = async (req,res) =>{
    try {
        const quizEvents = await quizEventModel.find().sort({eventDate: 1});

        res.status(200).json({message: "Quiz events retrieved successfully", success: true, data: quizEvents});
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error retrieving quiz events",
            error: error.message,
        });
    }
}
export const deleteQuizEvent = async (req,res) => {
    try {
        const quizEvent = await quizEventModel.findByIdAndDelete(req.params.eventId);
        console.log("Deleted Quiz");
        res.status(200).json({message: "Quiz event deleted successfully", success: true, data: quizEvent});
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error deleting quiz event",
            error: error.message,
        });
    }
}
export const modifyQuizEvent = async (req,res) => {
    try {
        const quizEvent = await quizEventModel.findByIdAndUpdate(req.params.eventId, req.body, {new: true});
        res.status(200).json({message: "Quiz event modified successfully", success: true, data: quizEvent});
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error modifying quiz event",
            error: error.message,
        });
    }
}