import React from "react";
import "./styles.scss";
import formatLongText from "../../../../../../utils/formatLongText";
import { capitalise } from "../../../../../../utils/capitalise";
import { getRandomColor } from "../../../../../../utils/colors";

const Result = ({ _id, code, name, handleModalClose, isAvailable }) => {
    function handleClick(code) {
        if (isAvailable) window.location = "/browse/" + code;
    }
    return (
        <div
            className={`result ${isAvailable}`}
            onClick={() => {
                if (isAvailable) {
                    handleClick(code);
                    handleModalClose();
                }
            }}
        >
            <span className="code">{code.toUpperCase()}</span>
            
            <span className="name">{capitalise(formatLongText(name, 40))}</span>
            <span className="info">{!isAvailable && "UNAVAILABLE"}</span>
            
        </div>
    );
};

export default Result;
