import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { UploadDialogContext } from "./dialogContext";
export default function UploadDialogProvider({ children }) {
    const [open, setIsOpen] = useState(false);
    const returnFocusRef = useRef(null);
    const setOpen = useCallback((value) => {
        if (value) {
            const active = document.activeElement;
            if (active && active !== document.body && !active.closest('[role="dialog"]'))
                returnFocusRef.current = active;
        }
        setIsOpen(value);
    }, []);
    const { pathname } = useLocation();
    useEffect(() => setOpen(false), [pathname, setOpen]);
    return (
        <UploadDialogContext value={{ open, setOpen, returnFocusRef }}>
            {children}
        </UploadDialogContext>
    );
}
