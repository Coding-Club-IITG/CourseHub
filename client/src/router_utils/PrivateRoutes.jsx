import { useSession } from "../session/context";
import { Outlet, Navigate, useLocation } from "react-router-dom";
import Loader from "../components/Loader";
import OperationNotice from "../components/OperationNotice";
import { RequestError } from "@coursehub/browser/react";
import "./PrivateRoutes.scss";
export default function PrivateRoutes() {
    const location = useLocation();
    const result = useSession();
    if (result.isError)
        return (
            <RequestError
                title="We couldn’t check your session. Please try again."
                onRetry={result.refetch}
            />
        );
    if (result.data === null)
        return (
            <Navigate
                to={
                    "/?returnTo=" +
                    encodeURIComponent(location.pathname + location.search + location.hash)
                }
                replace
            />
        );
    if (!result.data)
        return (
            <div className="session-gate" role="status">
                <Loader text="Checking your session..." />
            </div>
        );
    return (
        <>
            <Outlet />
            <OperationNotice />
        </>
    );
}
