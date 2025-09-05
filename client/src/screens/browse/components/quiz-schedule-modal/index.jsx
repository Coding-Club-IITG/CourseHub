import React, { useState } from "react";
import { createQuizEvent } from "../../../../api/Quiz";
import { toast } from "react-toastify";
import "./styles.scss";

const QuizScheduleModal = ({ isOpen, onClose, courseCode }) => {
    const [eventName, setEventName] = useState("");
    const [eventDate, setEventDate] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!eventName.trim() || !eventDate) {
            toast.error("Please fill in all fields");
            return;
        }

        setIsSubmitting(true);
        
        try {
            await createQuizEvent(eventName, eventDate, courseCode);
            toast.success("Quiz event scheduled successfully!");
            setEventName("");
            setEventDate("");
            onClose();
        } catch (error) {
            toast.error(error.message || "Failed to schedule quiz event");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        if (!isSubmitting) {
            setEventName("");
            setEventDate("");
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="quiz-modal-overlay" onClick={handleClose}>
            <div className="quiz-modal" onClick={(e) => e.stopPropagation()}>
                <div className="quiz-modal-header">
                    <h3>Schedule Quiz</h3>
                    <button 
                        className="close-button" 
                        onClick={handleClose}
                        disabled={isSubmitting}
                    >
                        ×
                    </button>
                </div>
                
                <form onSubmit={handleSubmit} className="quiz-modal-form">
                    <div className="form-group">
                        <label htmlFor="eventName">Event Name:</label>
                        <input
                            type="text"
                            id="eventName"
                            value={eventName}
                            onChange={(e) => setEventName(e.target.value)}
                            placeholder="Enter quiz name"
                            disabled={isSubmitting}
                            required
                        />
                    </div>
                    
                    <div className="form-group">
                        <label htmlFor="eventDate">Event Date:</label>
                        <input
                            type="datetime-local"
                            id="eventDate"
                            value={eventDate}
                            onChange={(e) => setEventDate(e.target.value)}
                            disabled={isSubmitting}
                            required
                        />
                    </div>
                    
                    <div className="form-actions">
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={handleClose}
                            disabled={isSubmitting}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? "Scheduling..." : "Schedule Quiz"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default QuizScheduleModal;
