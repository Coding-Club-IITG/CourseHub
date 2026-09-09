import { useState, useEffect, useRef } from "react";

export function FolderRename({ initialName = "", onCancel, onSave, affectedCourses = [] }) {
    const [name, setName] = useState(initialName);
    const inputRef = useRef();

    useEffect(() => {
        inputRef.current.focus();
        inputRef.current.select();
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
        <>
            {affectedCourses.length > 1 && (
                <p>Renaming changes this folder in {affectedCourses.join(", ")}.</p>
            )}
            <textarea
                ref={inputRef}
                value={name}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={() => onSave(name.trim() || initialName)}
                type="text"
                className="input-rename"
            ></textarea>
        </>
    );
}
