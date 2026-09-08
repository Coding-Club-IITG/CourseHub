import { useEffect, useState } from "react";
import { Outlet, Navigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { getUser } from "../api/User";
import { LoginUser, LogoutUser } from "../actions/user_actions";
import Loader from "../components/Loader";
import "./PrivateRoutes.scss";

const PrivateRoutes = () => {
    const loggedIn = useSelector((state) => state.user.loggedIn);
    const dispatch = useDispatch();
    const [status, setStatus] = useState("checking");
    const [attempt, setAttempt] = useState(0);

    useEffect(() => {
        if (loggedIn) return;
        const controller = new AbortController();
        setStatus("checking");
        getUser(controller.signal)
            .then(({ data }) => {
                if (controller.signal.aborted) return;
                if (data.needsCourseSync) return setStatus("sync");
                dispatch(LoginUser(data));
                setStatus("ready");
            })
            .catch((error) => {
                if (controller.signal.aborted) return;
                if (error.response?.status === 401) {
                    dispatch(LogoutUser());
                    setStatus("signed-out");
                } else {
                    setStatus("error");
                }
            });
        return () => controller.abort();
    }, [loggedIn, dispatch, attempt]);

    if (loggedIn) return <Outlet />;
    if (status === "signed-out") return <Navigate to="/" replace />;
    if (status === "sync") return <Navigate to="/loading" replace />;
    if (status === "error") {
        return (
            <div className="session-gate" role="alert">
                <div className="session-gate-message">
                    <p>We couldn’t check your session. Please try again.</p>
                    <button
                        className="session-gate-retry"
                        type="button"
                        onClick={() => setAttempt((value) => value + 1)}
                    >
                        Try again
                    </button>
                </div>
            </div>
        );
    }
    return (
        <div className="session-gate" role="status">
            <Loader text="Checking your session..." />
        </div>
    );
};

export default PrivateRoutes;
