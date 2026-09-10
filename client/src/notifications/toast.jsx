import { toast as notify } from "react-toastify";
import Notice from "./Notice";

export const toast = Object.fromEntries(
    ["success", "error", "info", "warning"].map((type) => [
        type,
        (message) =>
            notify[type](({ closeToast }) => (
                <Notice tone={type} message={message} onDismiss={closeToast}>
                    {message}
                </Notice>
            )),
    ]),
);
