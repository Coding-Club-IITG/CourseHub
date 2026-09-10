import * as Radix from "@radix-ui/react-dialog";
import * as Alert from "@radix-ui/react-alert-dialog";
import { useRef } from "react";
import { Button, IconButton, CloseIcon } from "./controls";
import styles from "./primitives.module.scss";

// Controlled dialogs can be opened from URL state or a provider without a Radix Trigger
// Capture the active opener before Radix moves focus; restore it only while it survives
const focusable = (node) =>
    node && node !== document.body && node !== document.documentElement ? node : null;
function useDialogFocus(initialFocusRef, returnFocusRef) {
    const opener = useRef(null);
    return {
        onOpenAutoFocus(event) {
            opener.current = focusable(document.activeElement);
            if (initialFocusRef?.current) {
                event.preventDefault();
                initialFocusRef.current.focus();
            }
        },
        onCloseAutoFocus(event) {
            const target = returnFocusRef?.current || opener.current;
            if (target?.isConnected) {
                event.preventDefault();
                target.focus();
            }
        },
    };
}
export function Dialog({
    open,
    onOpenChange,
    title,
    description,
    children,
    footer,
    busy = false,
    dismissible = true,
    initialFocusRef,
    returnFocusRef,
    className = "",
    bodyClassName = "",
    footerClassName = "",
    closeLabel = "Dismiss dialog",
    ...props
}) {
    const focus = useDialogFocus(initialFocusRef, returnFocusRef);
    const canDismiss = dismissible && !busy;
    return (
        <Radix.Root
            open={open}
            onOpenChange={(value) => {
                if (value || canDismiss) onOpenChange(value);
            }}
        >
            <Radix.Portal>
                <Radix.Overlay className={styles.overlay}>
                    <Radix.Content
                        onClick={(event) => event.stopPropagation()}
                        {...props}
                        {...focus}
                        {...(!description ? { "aria-describedby": undefined } : {})}
                        aria-busy={busy || undefined}
                        className={`${styles.dialog} ${className}`}
                        onEscapeKeyDown={(event) => {
                            if (!canDismiss) event.preventDefault();
                        }}
                        onPointerDownOutside={(event) => {
                            if (!canDismiss) event.preventDefault();
                        }}
                    >
                        <header className={styles.dialogHeader}>
                            <Radix.Title className={styles.dialogTitle}>{title}</Radix.Title>
                            {description && (
                                <Radix.Description className={styles.dialogDescription}>
                                    {description}
                                </Radix.Description>
                            )}
                            {dismissible && (
                                <IconButton
                                    label={closeLabel}
                                    variant="ghost"
                                    disabled={busy}
                                    onClick={() => onOpenChange(false)}
                                    className={styles.dialogClose}
                                >
                                    <CloseIcon />
                                </IconButton>
                            )}
                        </header>
                        <div
                            data-ui-dialog-body
                            className={`${styles.dialogBody} ${bodyClassName}`}
                        >
                            {children}
                        </div>
                        {footer && (
                            <footer
                                data-ui-dialog-footer
                                className={`${styles.dialogFooter} ${footerClassName}`}
                            >
                                {footer}
                            </footer>
                        )}
                    </Radix.Content>
                </Radix.Overlay>
            </Radix.Portal>
        </Radix.Root>
    );
}
export function ConfirmDialog({
    open,
    onOpenChange,
    title,
    description,
    children,
    onConfirm,
    confirmLabel = "Confirm",
    cancelLabel = "Cancel",
    busy = false,
    error,
    danger = true,
    returnFocusRef,
}) {
    const cancel = useRef(null);
    const focus = useDialogFocus(cancel, returnFocusRef);
    return (
        <Alert.Root
            open={open}
            onOpenChange={(value) => {
                if (value || !busy) onOpenChange(value);
            }}
        >
            <Alert.Portal>
                <Alert.Overlay className={styles.overlay}>
                    <Alert.Content
                        onClick={(event) => event.stopPropagation()}
                        {...focus}
                        className={styles.dialog}
                        aria-busy={busy || undefined}
                        onEscapeKeyDown={(event) => {
                            if (busy) event.preventDefault();
                        }}
                    >
                        <header className={styles.dialogHeader}>
                            <Alert.Title className={styles.dialogTitle}>{title}</Alert.Title>
                            <Alert.Description className={styles.dialogDescription}>
                                {description}
                            </Alert.Description>
                        </header>
                        <div className={styles.dialogBody}>
                            {children}
                            {error && (
                                <p role="alert" className={styles.fieldError}>
                                    {error.message || error}
                                </p>
                            )}
                        </div>
                        <footer className={styles.dialogFooter}>
                            <Alert.Cancel asChild>
                                <Button ref={cancel} variant="secondary" disabled={busy}>
                                    {cancelLabel}
                                </Button>
                            </Alert.Cancel>
                            <Button
                                variant={danger ? "danger" : "primary"}
                                busy={busy}
                                busyLabel="Working…"
                                onClick={onConfirm}
                            >
                                {confirmLabel}
                            </Button>
                        </footer>
                    </Alert.Content>
                </Alert.Overlay>
            </Alert.Portal>
        </Alert.Root>
    );
}
