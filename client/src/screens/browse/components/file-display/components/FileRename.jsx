import React, { useState, useEffect, useRef } from "react";

export function FileRename({ initialName = "", onCancel, onSave }) {
    const [name, setName] = useState(initialName);
    const inputRef = useRef();
    const isFinishedRef = useRef(false);

    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, []);

    const handleKeyDown = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            isFinishedRef.current = true;
            onSave(name.trim() || initialName);
        } else if (e.key === "Escape") {
            isFinishedRef.current = true;
            onCancel();
        }
    };

    const handleBlur = () => {
        if (!isFinishedRef.current) {
            isFinishedRef.current = true;
            onSave(name.trim() || initialName);
        }
    };

    return (
        <textarea
            ref={inputRef}
            value={name}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            className="input-rename"
        ></textarea>
    );
}

export default FileRename;
