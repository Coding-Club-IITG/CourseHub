import React from "react";
import Yroptions from "./year-options";
import { useState } from "react";
import Wrapper from "../../../contributions/components/wrapper";

const ConfirmDialog = ({
    show,
    yearName = "",
    onYearNameChange = () => {},
    onCancel,
    onConfirm,
    course,
}) => {
    const [submitEnabled, setSubmitEnabled] = useState(false);
    if (!show) return null;

    return (
        <div
            className="confirm-dialog-overlay"
            onClick={(e) => {
                if (e.target === e.currentTarget) onCancel();
            }}
        >

            <Wrapper>
                <div className="head">📁 Add Year</div>
                <div className="disclaimer">
                    The year will be added in the current course
                </div>
                
                <div className="section" id="bottommarginneeded">
                    <label htmlFor="section" className="label_section">
                        YEAR: 
                    </label>
                    <select
                        name="section"
                        className="select_section"
                        value={yearName}
                        onChange={(e) => {
                            if (e.target.value) setSubmitEnabled(true);
                            else setSubmitEnabled(false);
                            onYearNameChange(e.target.value);
                        }}
                    >
                        <option value="" disabled>
                            Select year
                        </option>
                        
                        <Yroptions
                            course={course}
                        />
                    </select>
                </div>
                
                <div className="addfolderbuttoncontainer">
                    <div className="button cancelbutton addfolderbutton" onClick={onCancel}>
                        CANCEL
                    </div>
                    <div className={`button ${submitEnabled} submitbutton addfolderbutton`} onClick={onConfirm}>
                        ADD
                    </div>
                </div>
            </Wrapper>

            
            
        </div>
    );
};

export { ConfirmDialog };
