import React, { useState, useEffect, useRef } from "react";

export function FileRename({ initialName = "", onCancel, onSave, affectedCourses = [] }) {
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
        if (e.key === "Enter") {
            e.preventDefault();
            const trimmed = name.trim();
            if (!trimmed) {
                isFinishedRef.current = true;
                onCancel();
                return;
            }
            isFinishedRef.current = true;
            onSave(trimmed);
        } else if (e.key === "Escape") {
            isFinishedRef.current = true;
            onCancel();
        }
    };

    const handleBlur = () => {
        if (!isFinishedRef.current) {
            isFinishedRef.current = true;
            const trimmed = name.trim();
            if (!trimmed) {
                onCancel();
            } else {
                onSave(trimmed);
            }
        }
    };

    return (
        <>
        {affectedCourses.length > 1 && <p>Renaming changes this file in {affectedCourses.join(", ")}.</p>}
        <input
            ref={inputRef}
            type="text"
            value={name}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            className="input-rename"
            maxLength={200}
        />
        </>
    );
}

export default FileRename;
