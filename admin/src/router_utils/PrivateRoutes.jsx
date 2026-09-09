import React, { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { checkAdminSession } from "@/apis/auth";
import OperationNotice from "@/components/OperationNotice";

export default function PrivateRoute({ children }) {
    const location = useLocation();
    const [loading, setLoading] = useState(true);
    const [ok, setOk] = useState(false);

    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                const isOk = await checkAdminSession();
                if (mounted) setOk(isOk);
            } catch {
                if (mounted) setOk(false);
            } finally {
                if (mounted) setLoading(false);
            }
        })();
        return () => {
            mounted = false;
        };
    }, []);

    if (loading) return null;
    if (!ok) return <Navigate to={`/admin/login?returnTo=${encodeURIComponent(location.pathname + location.search + location.hash)}`} replace />;
    return <><OperationNotice />{children}</>;
}
