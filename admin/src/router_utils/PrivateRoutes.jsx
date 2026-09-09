import { Navigate, useLocation } from "react-router-dom";
import { useSession } from "../session";
import OperationNotice from "@/components/OperationNotice";
import { RequestError } from "@coursehub/browser/react";
export default function PrivateRoute({ children }) {
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
                    "/admin/login?returnTo=" +
                    encodeURIComponent(location.pathname + location.search + location.hash)
                }
                replace
            />
        );
    if (!result.data)
        return (
            <p role="status" className="p-6">
                Checking your session...
            </p>
        );
    return (
        <>
            <OperationNotice />
            {children}
        </>
    );
}
