import React from "react";
import Yroptions from "./year-options";
import { useState } from "react";
import Wrapper from "../../../contributions/components/wrapper";

const styles = {
    overlay: {
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
    },
};

const ConfirmDialog = ({
    show,
    yearName = "",
    onYearNameChange = () => {},
    profName= "",
    onProfNameChange = () => {},
    onCancel,
    onConfirm,
    course,
}) => {
    const [submitEnabled, setSubmitEnabled] = useState(false);
    if (!show) return null;

    return (
        <div style={styles.overlay}>

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
                <div className="section" id="bottommarginneeded">
                    <label htmlFor="profname" className="label_section">
                        Professor Name:
                    </label>
                    <input
                        type="text"
                        name="profname"
                        className="input_profname"
                        value={profName}
                        onChange={(e) => onProfNameChange(e.target.value)}
                        placeholder="Enter professor name"
                    />
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
