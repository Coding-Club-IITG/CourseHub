import "./styles.scss";
import shareIllustration from "./assets/banner.svg";
import { useEffect, useId, useRef, useState } from "react";
const Share = ({ selection, onClose }) => {
    const dialog = useRef(null);
    const input = useRef(null);
    const titleId = useId();
    const [status, setStatus] = useState("");
    useEffect(() => {
        setStatus("");
        if (!selection) return;
        const element = dialog.current;
        const overflow = document.documentElement.style.overflow;
        document.documentElement.style.overflow = "hidden";
        element.showModal();
        return () => {
            element.close();
            document.documentElement.style.overflow = overflow;
        };
    }, [selection]);
    const copy = async () => {
        try {
            await navigator.clipboard.writeText(selection.link);
            setStatus("Link copied.");
        } catch {
            setStatus("Could not copy. Select the link and copy it manually.");
            input.current?.focus();
            input.current?.select();
        }
    };
    return (
        <dialog
            ref={dialog}
            className="coursehub-share"
            aria-labelledby={titleId}
            onCancel={(event) => {
                event.preventDefault();
                onClose();
            }}
            onClick={(event) => {
                if (event.target === event.currentTarget) {
                    const r = event.currentTarget.getBoundingClientRect();
                    if (
                        event.clientX < r.left ||
                        event.clientX > r.right ||
                        event.clientY < r.top ||
                        event.clientY > r.bottom
                    )
                        onClose();
                }
            }}
        >
            {selection && (
                <>
                    <h2 id={titleId}>Share {selection.kind || "file"}</h2>
                    <p className="share-name">{selection.name}</p>
                    <p className="share-help">
                        Sign-in is required to open this link.
                        {selection.pending
                            ? " This file is pending approval. Only its uploader and course BRs can open it."
                            : ""}
                    </p>
                    <label htmlFor={titleId + "-link"}>CourseHub link</label>
                    <input
                        ref={input}
                        id={titleId + "-link"}
                        aria-label="Share link"
                        value={selection.link}
                        readOnly
                        onFocus={(event) => {
                            event.target.select();
                            event.target.scrollLeft = 0;
                        }}
                    />
                    <p className="share-status" role="status">
                        {status}
                    </p>
                    <img
                        className="share-illustration"
                        src={shareIllustration}
                        width="560"
                        height="253"
                        alt=""
                    />
                    <div className="share-actions">
                        <button type="button" className="primary" onClick={copy}>
                            Copy link
                        </button>
                        <button type="button" className="close" onClick={onClose}>
                            Close
                        </button>
                    </div>
                </>
            )}
        </dialog>
    );
};
export default Share;
