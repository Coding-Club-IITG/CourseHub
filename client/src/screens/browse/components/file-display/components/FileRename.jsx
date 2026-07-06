import React, { useState, useEffect, useRef } from "react";

export function FileRename({ initialName = "", onCancel, onSave }) {
    const [name, setName] = useState(initialName);
    const inputRef = useRef();

    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, []);

    const handleKeyDown = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            onSave(name.trim() || initialName);
        } else if (e.key === "Escape") {
            onCancel();
        }
    };

    return (
        <textarea
            ref={inputRef}
            value={name}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => onSave(name.trim() || initialName)}
            className="input-rename"
        ></textarea>
    );
}

export default FileRename;
