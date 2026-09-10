import { useRef, useState } from "react";
import { Button, Dialog, FormField } from "@coursehub/ui";
import shareIllustration from "./assets/banner.svg";
import styles from "./styles.module.scss";
export default function Share({ selection, onClose }) {
    const input = useRef(null);
    const [status, setStatus] = useState("");
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
        <Dialog
            open={!!selection}
            onOpenChange={(open) => {
                if (!open) onClose();
            }}
            title={`Share ${selection?.kind || "file"}`}
            initialFocusRef={input}
            className={styles.share}
            footer={
                <>
                    <Button onClick={copy}>Copy link</Button>
                    <Button variant="link" className={styles.close} onClick={onClose}>
                        Close
                    </Button>
                </>
            }
        >
            {selection && (
                <>
                    <p className={styles.name}>{selection.name}</p>
                    <p className={styles.help}>
                        Sign-in is required to open this link.
                        {selection.pending
                            ? " This file is pending approval. Only its uploader and course BRs can open it."
                            : ""}
                    </p>
                    <FormField label="CourseHub link">
                        <input
                            ref={input}
                            aria-label="Share link"
                            readOnly
                            value={selection.link}
                            onFocus={(event) => {
                                event.target.select();
                                event.target.scrollLeft = 0;
                            }}
                        />
                    </FormField>
                    <p className={styles.status} role="status">
                        {status}
                    </p>
                    <img
                        className={styles.illustration}
                        src={shareIllustration}
                        width="560"
                        height="253"
                        alt=""
                    />
                </>
            )}
        </Dialog>
    );
}
