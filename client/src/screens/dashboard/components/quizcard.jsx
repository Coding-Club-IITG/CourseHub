import React from "react";
import "./quizcard.scss";

const QuizCard = ({ code, name, date, day, color }) => {
    return (
        <div className="quizcard" style={{ background: color }}>
            <div className="quizcard-code">{code}</div>
            <div className="quizcard-name">{name}</div>
            <div className="quizcard-date">{date}</div>
            <div className="quizcard-day">{day}</div>
        </div>
    );
};

export default QuizCard;
