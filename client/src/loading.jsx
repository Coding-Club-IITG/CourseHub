import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { getUser } from "./api/User";
import { synchronizeCourses } from "./api/Course";
import { getOperation } from "./api/Operation";
import { LoginUser } from "./actions/user_actions";
import { loginDestination } from "./utils/loginDestination";
import "./loading.css";

export default function LoadingPage() {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const [error, setError] = useState(null);
    const [attempt, setAttempt] = useState(0);
    const [saved, setSaved] = useState(null);
    const destination = loginDestination(
        new URLSearchParams(window.location.search).get("returnTo"),
    );

    useEffect(() => {
        const controller = new AbortController();
        let timer;
        const signal = controller.signal;
        setError(null);
        const finish = async () => {
            const { data } = await getUser(signal);
            if (signal.aborted) return;
            dispatch(LoginUser(data));
            navigate(destination, { replace: true });
        };
        const fail = (failure) => {
            if (signal.aborted) return;
            if (failure.response?.status === 401)
                navigate(`/?returnTo=${encodeURIComponent(destination)}`, { replace: true });
            else
                setError(
                    failure.response?.data?.message ||
                        failure.message ||
                        "Courses could not be refreshed. Please try again.",
                );
        };
        const poll = async (id) => {
            try {
                const operation = await getOperation(id, signal);
                if (signal.aborted) return;
                if (operation.status === "completed") return await finish();
                if (["failed", "cancelled"].includes(operation.status))
                    throw new Error(
                        operation.error?.message || "The course refresh could not finish.",
                    );
                timer = setTimeout(() => poll(id), 1000);
            } catch (failure) {
                fail(failure);
            }
        };
        (async () => {
            try {
                const { data } = await getUser(signal);
                if (signal.aborted) return;
                setSaved(data);
                const operation = await synchronizeCourses(signal);
                if (!signal.aborted) await poll(operation.operationId);
            } catch (failure) {
                fail(failure);
            }
        })();
        return () => {
            controller.abort();
            clearTimeout(timer);
        };
    }, [attempt, destination, dispatch, navigate]);

    return (
        <main className="loading-page" aria-busy={!error}>
            {!error && <div className="course-sync-spinner" aria-hidden="true" />}
            <div className="loading-text">
                <h1>{error ? "Course refresh unavailable" : "Refreshing your courses"}</h1>
                <p role={error ? "alert" : "status"}>
                    {error || "This may take a minute. You can continue while it runs."}
                </p>
                {error && (
                    <button type="button" onClick={() => setAttempt((value) => value + 1)}>
                        Try again
                    </button>
                )}
                {saved && (
                    <Link to={destination} onClick={() => dispatch(LoginUser(saved))}>
                        Continue with saved courses
                    </Link>
                )}
            </div>
        </main>
    );
}
