import { useLocation, useNavigate } from "react-router-dom";
export function useWorkflowLocation() {
    const location = useLocation(),
        navigate = useNavigate(),
        params = new URLSearchParams(location.search);
    const update = (changes) => {
        const next = new URLSearchParams(location.search);
        for (const [key, value] of Object.entries(changes)) {
            if (value === undefined || value === "") next.delete(key);
            else next.set(key, String(value));
        }
        navigate(
            {
                pathname: location.pathname,
                search: next.toString() ? "?" + next : "",
                hash: location.hash,
            },
            { replace: true },
        );
    };
    return { params, update };
}
