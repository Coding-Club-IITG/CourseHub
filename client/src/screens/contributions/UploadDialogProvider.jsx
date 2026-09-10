import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { UploadDialogContext } from "./dialogContext";
export default function UploadDialogProvider({ children }) {
    const [open, setOpen] = useState(false);
    const { pathname } = useLocation();
    useEffect(() => setOpen(false), [pathname]);
    return <UploadDialogContext value={{ open, setOpen }}>{children}</UploadDialogContext>;
}
