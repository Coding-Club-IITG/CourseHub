import { IconButton, Icon } from "@coursehub/ui";
import styles from "./styles.module.scss";
export default function DismissNotification({ closeToast }) {
    return (
        <IconButton
            className={styles.close}
            variant="ghost"
            size="sm"
            label="Dismiss notification"
            onClick={closeToast}
        >
            <Icon name="close" size={16} />
        </IconButton>
    );
}
