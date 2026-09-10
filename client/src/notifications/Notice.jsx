import { useEffect, useRef, useState } from "react";
import { Icon } from "@coursehub/ui";
import DismissNotification from "./DismissNotification";
import { readingTime } from "./timing";
import styles from "./styles.module.scss";

export default function Notice({
    tone = "info",
    message,
    persistent = false,
    onDismiss,
    children,
}) {
    const [paused, setPaused] = useState(false);
    const [windowActive, setWindowActive] = useState(!document.hidden);
    const remaining = useRef(readingTime(message));
    const dismiss = useRef(onDismiss);
    useEffect(() => {
        dismiss.current = onDismiss;
    }, [onDismiss]);
    useEffect(() => {
        remaining.current = readingTime(message);
    }, [message, persistent]);
    useEffect(() => {
        const focus = () => setWindowActive(true),
            blur = () => setWindowActive(false);
        window.addEventListener("focus", focus);
        window.addEventListener("blur", blur);
        return () => {
            window.removeEventListener("focus", focus);
            window.removeEventListener("blur", blur);
        };
    }, []);
    useEffect(() => {
        if (persistent || paused || !windowActive) return;
        const started = Date.now();
        const timer = setTimeout(() => dismiss.current(), remaining.current);
        return () => {
            clearTimeout(timer);
            remaining.current = Math.max(0, remaining.current - (Date.now() - started));
        };
    }, [persistent, paused, windowActive, message]);
    return (
        <div
            className={styles.notice}
            data-tone={tone}
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={(event) =>
                setPaused(event.currentTarget.contains(document.activeElement))
            }
            onFocus={() => setPaused(true)}
            onBlur={(event) =>
                setPaused(
                    event.currentTarget.matches(":hover") ||
                        event.currentTarget.contains(event.relatedTarget),
                )
            }
        >
            <span className={styles.statusIcon}>
                <Icon
                    name={
                        tone === "success"
                            ? "check"
                            : tone === "error" || tone === "warning"
                              ? "warning"
                              : "info"
                    }
                />
            </span>
            <div className={styles.body}>{children}</div>
            <DismissNotification closeToast={onDismiss} />
        </div>
    );
}
