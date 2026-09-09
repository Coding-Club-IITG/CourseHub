import { Component } from "react";

export function RequestError({ error, onRetry, title = "We couldn’t load this page." }) {
    return (
        <div
            role="alert"
            style={{
                margin: "24px",
                padding: "24px",
                background: "#fff",
                color: "#222",
                border: "1px solid #ddd",
                borderRadius: "12px",
            }}
        >
            <p>{title}</p>
            {error?.message && <p>{error.message}</p>}
            {error?.requestId && <p>Reference: {error.requestId}</p>}
            {onRetry && (
                <button
                    type="button"
                    onClick={onRetry}
                    style={{
                        marginTop: "12px",
                        padding: "10px 18px",
                        background: "#ffdf00",
                        color: "#111",
                        border: "1px solid #111",
                        borderRadius: "6px",
                        cursor: "pointer",
                    }}
                >
                    Try again
                </button>
            )}
        </div>
    );
}

export class RouteBoundary extends Component {
    state = { failed: false, resetKey: this.props.resetKey };
    static getDerivedStateFromProps(props, state) {
        return props.resetKey !== state.resetKey
            ? { failed: false, resetKey: props.resetKey }
            : null;
    }
    static getDerivedStateFromError() {
        return { failed: true };
    }
    render() {
        return this.state.failed ? (
            <RequestError
                title="This page couldn’t be displayed."
                onRetry={() => {
                    this.props.onReset?.();
                    this.setState({ failed: false });
                }}
            />
        ) : (
            this.props.children
        );
    }
}
