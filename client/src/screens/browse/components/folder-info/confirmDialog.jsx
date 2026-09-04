import React from "react";
import { useState } from "react";
import Wrapper from "../../../contributions/components/wrapper";


const ConfirmDialog = ({
    show,
    input = false,
    inputValue = "",
    onInputChange = () => { },
    childType = "",
    onChildTypeChange = () => { },
    onCancel,
    onConfirm,
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
                <div className="head">📁 Add Folder</div>
                <div className="disclaimer">
                    The new folder will be a subfolder of the current folder
                </div>
                <div className="course">
                    <label className="label_course" htmlFor="folder">
                        NAME :
                    </label>
                    <input
                        placeholder="Name of Folder"
                        name="folder"
                        className="input_course"
                        value={inputValue}
                        onChange={(e) => {
                            if (e.target.value.length > 0) setSubmitEnabled(true);
                            else setSubmitEnabled(false);
                            onInputChange(e);
                        }}
                    />
                </div>
                <div className="section" id="bottommarginneeded">
                    <label htmlFor="section" className="label_section">
                        CHILD TYPE :
                    </label>
                    <select
                        name="section"
                        className="select_section"
                        value={childType}
                        onChange={(e) => onChildTypeChange(e.target.value)}
                    >
                        <option value="File">File</option>
                        <option value="Folder">Folder</option>
                    </select>
                </div>
                <div id="uploaded-container">
                        <div>⚠️</div>
                        <div>The Child Type of the folder indicates whether this new folder will have subfolders or files inside it</div>
                    </div>
                <div className="addfolderbuttoncontainer">
                    <div className="button cancelbutton addfolderbutton" onClick={onCancel}>
                        CANCEL
                    </div>
                    <div className={`button ${submitEnabled} submitbutton addfolderbutton`} onClick={onConfirm}>
                        CREATE
                    </div>
                </div>
            </Wrapper>
        </div>
    );
};

export { ConfirmDialog };
