import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useSession } from "../../session/context";
import { ShareContext } from "./context";
import Share from "./index";
export default function ShareProvider({ children }) {
    const [selection, setSelection] = useState(null);
    const { key } = useLocation();
    const actor = useSession().data;
    const scope = JSON.stringify([actor?._id, actor?.capabilities]);
    useEffect(() => setSelection(null), [key, scope]);
    return (
        <ShareContext value={setSelection}>
            {children}
            <Share
                key={selection?.link || "closed"}
                selection={actor ? selection : null}
                onClose={() => setSelection(null)}
            />
        </ShareContext>
    );
}
