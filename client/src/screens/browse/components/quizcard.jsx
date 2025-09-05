import React from "react";
import "./quizcard.scss";

const QuizCard = ({ code, name, date, day, color }) => {
    return (
        <div className="quizcard" style={{ background: color }}>
            <div className="quizcard-header">
                <span className="quizcard-code">{code}</span>
                <span className="quizcard-name">{name}</span>
            </div>
            <div className="quizcard-date">
                <span>{date}</span>
                <span>{day}</span>
            </div>
        </div>
    );
};

export default QuizCard;
