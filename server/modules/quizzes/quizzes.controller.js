import quizEventModel from "./quizzes.model.js";

export const createQuizEvent = async (req, res) => {
    try {
        const {eventName, eventDate, course} = req.body;
        if(!eventName || !eventDate || !course){
            console.log("All fields are required");
            return res.status(400).json({message: "All fields are required", success: false});
        }
        
        const newQuizEvent = new quizEventModel({
            eventName,
            eventDate,
            course,
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
        const quizEvents = await quizEventModel.find().sort({eventDate: -1});

        res.status(200).json({message: "Quiz events retrieved successfully", success: true, data: quizEvents});
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error retrieving quiz events",
            error: error.message,
        });
    }
}
