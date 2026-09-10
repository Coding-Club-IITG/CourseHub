import { cloneElement, useId } from "react";
import styles from "./primitives.module.scss";

export function ButtonLink({
    children,
    variant = "primary",
    size = "default",
    className = "",
    ...props
}) {
    return (
        <a
            {...props}
            data-variant={variant}
            data-size={size}
            className={`${styles.button} ${className}`}
        >
            {children}
        </a>
    );
}

export function Button({
    children,
    variant = "primary",
    size = "default",
    busy = false,
    busyLabel,
    disabled,
    className = "",
    type = "button",
    ...props
}) {
    return (
        <button
            {...props}
            type={type}
            disabled={disabled || busy}
            aria-busy={busy || undefined}
            data-variant={variant}
            data-size={size}
            className={`${styles.button} ${className}`}
        >
            {busy && <span className={styles.spinner} aria-hidden="true" />}
            {busy && busyLabel ? busyLabel : children}
        </button>
    );
}
export function IconButton({ label, title = label, children, className = "", ...props }) {
    return (
        <Button
            {...props}
            className={`${styles.iconButton} ${className}`}
            aria-label={label}
            title={title}
        >
            {children}
        </Button>
    );
}
export function CloseIcon() {
    return (
        <svg
            viewBox="0 0 24 24"
            width="20"
            height="20"
            aria-hidden="true"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
        >
            <path d="m6 6 12 12M6 18 18 6" />
        </svg>
    );
}
export function FormField({
    label,
    hint,
    error,
    children,
    id: suppliedId,
    required,
    className = "",
}) {
    const generatedId = useId();
    const id = suppliedId || children.props.id || generatedId;
    const describedBy =
        [children.props["aria-describedby"], hint && `${id}-hint`, error && `${id}-error`]
            .filter(Boolean)
            .join(" ") || undefined;
    return (
        <div className={`${styles.field} ${className}`}>
            <label htmlFor={id}>
                {label}
                {required && <span aria-hidden="true"> *</span>}
            </label>
            {cloneElement(children, {
                id,
                required: required ?? children.props.required,
                "aria-describedby": describedBy,
                "aria-invalid": error ? true : children.props["aria-invalid"],
                className: `${styles.input} ${children.props.className || ""}`,
            })}
            {hint && (
                <p id={`${id}-hint`} className={styles.hint}>
                    {hint}
                </p>
            )}
            {error && (
                <p id={`${id}-error`} className={styles.fieldError} role="alert">
                    {error}
                </p>
            )}
        </div>
    );
}
export function Badge({ children, tone = "neutral", className = "", ...props }) {
    return (
        <span {...props} data-tone={tone} className={`${styles.badge} ${className}`}>
            {children}
        </span>
    );
}
export function LoadingState({ title = "Loading…", children, className = "" }) {
    return (
        <div className={`${styles.state} ${className}`} role="status">
            <span className={styles.spinner} aria-hidden="true" />
            <p className={styles.stateTitle}>{title}</p>
            {children}
        </div>
    );
}
export function ErrorState({
    title = "We couldn’t load this page.",
    error,
    onRetry,
    retrying,
    children,
    className = "",
}) {
    return (
        <div role="alert" className={`${styles.state} ${className}`}>
            <p className={styles.stateTitle}>{title}</p>
            {error?.message && <p>{error.message}</p>}
            {children}
            {error?.requestId && <p className={styles.hint}>Reference: {error.requestId}</p>}
            {onRetry && (
                <Button onClick={onRetry} busy={retrying} busyLabel="Trying again…">
                    Try again
                </Button>
            )}
        </div>
    );
}
export function EmptyState({
    title = "Nothing here yet",
    children,
    illustration,
    action,
    className = "",
}) {
    return (
        <div className={`${styles.state} ${className}`}>
            {illustration && <div className={styles.illustration}>{illustration}</div>}
            <p className={styles.stateTitle}>{title}</p>
            {children}
            {action}
        </div>
    );
}

export function Brand({ className = "" }) {
    return <span className={`${styles.brand} ${className}`}>CourseHub</span>;
}

export function Input({ className = "", ...props }) {
    return <input {...props} className={`${styles.input} ${className}`} />;
}
