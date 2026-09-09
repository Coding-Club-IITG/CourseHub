import { useLocation } from "react-router-dom";
import { RouteBoundary as Boundary } from "@coursehub/browser/react";
import { session } from "../session";
export default function RouteBoundary({ children }) {
    const location = useLocation();
    return (
        <Boundary resetKey={location.key} onReset={() => session.queryClient.invalidateQueries()}>
            {children}
        </Boundary>
    );
}
