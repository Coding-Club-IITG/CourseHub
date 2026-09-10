import { Component } from "react";
import { ErrorState } from "@coursehub/ui";

export function RequestError(props) {
    return <ErrorState {...props} />;
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
