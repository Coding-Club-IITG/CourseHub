import React from "react";
import "./quizcard.scss";

const QuizCard = ({ code, name, date, time, color,children }) => {
    return (
       <>
       <div className="quizcard" style={{ background: color }}>
            <div className="quizcard-code">{code}</div>
            <div className="quizcard-name">{name}</div>
            <div className="quizcard-date">{date}</div>
            <div className="quizcard-day">{time}</div>
            {children}
        </div>
        
</> 
    );
};

export default QuizCard;
