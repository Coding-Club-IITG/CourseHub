import { useState } from "react";
import { ToastContainer, cssTransition } from "react-toastify";
import { NotificationTarget } from "./context";
import "react-toastify/dist/ReactToastify.css";
import styles from "./styles.module.scss";

const transition = cssTransition({ enter: styles.enter, exit: styles.exit, collapseDuration: 160 });
export default function Notifications({ children }) {
    const [target, setTarget] = useState(null);
    return (
        <NotificationTarget value={target}>
            {children}
            <div className={styles.host} aria-label="Notifications">
                <ToastContainer
                    position="bottom-right"
                    autoClose={false}
                    hideProgressBar
                    newestOnTop={false}
                    closeOnClick={false}
                    draggable={false}
                    pauseOnHover
                    pauseOnFocusLoss
                    transition={transition}
                    closeButton={false}
                    icon={false}
                    className={styles.toasts}
                    limit={3}
                />
                <div ref={setTarget} />
            </div>
        </NotificationTarget>
    );
}
