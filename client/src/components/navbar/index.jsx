import { useEffect, useId, useRef, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { Brand, Button, IconButton } from "@coursehub/ui";
import { logoutUser } from "../../api/User";
import SearchBar from "./components/searchbar";
import styles from "./styles.module.scss";
export default function NavBar({ compact = false }) {
    const [open, setOpen] = useState(false),
        [busy, setBusy] = useState(false),
        [error, setError] = useState("");
    const menu = useRef(null),
        trigger = useRef(null),
        id = useId(),
        location = useLocation(),
        navigate = useNavigate();
    useEffect(() => setOpen(false), [location.key]);
    useEffect(() => {
        if (!open) return;
        menu.current?.querySelector("a")?.focus();
        const outside = (event) => {
            if (!menu.current?.contains(event.target) && !trigger.current?.contains(event.target))
                setOpen(false);
        };
        document.addEventListener("pointerdown", outside);
        return () => document.removeEventListener("pointerdown", outside);
    }, [open]);
    const logout = async () => {
        if (busy) return;
        setBusy(true);
        setError("");
        try {
            await logoutUser();
            navigate("/", { replace: true });
        } catch {
            setError("Could not log out. Please try again.");
        } finally {
            setBusy(false);
        }
    };
    return (
        <nav
            className={styles.navbar}
            aria-label="Main navigation"
            onKeyDown={(event) => {
                if (event.key === "Escape" && open) {
                    setOpen(false);
                    trigger.current?.focus();
                }
            }}
        >
            <div className={styles.content}>
                <Link className={styles.logo} to="/dashboard" aria-label="CourseHub dashboard">
                    <Brand />
                </Link>
                <IconButton
                    ref={trigger}
                    label="Toggle mobile menu"
                    className={styles.toggle}
                    variant="ghost"
                    aria-expanded={open}
                    aria-controls={id}
                    onClick={() => setOpen((value) => !value)}
                >
                    <svg
                        width="20"
                        height="24"
                        viewBox="0 0 20 24"
                        aria-hidden="true"
                        fill="currentColor"
                    >
                        <circle cx="10" cy="5" r="2" />
                        <circle cx="10" cy="12" r="2" />
                        <circle cx="10" cy="19" r="2" />
                    </svg>
                </IconButton>
                <div
                    ref={menu}
                    id={id}
                    className={styles.links}
                    data-open={open}
                    onBlur={(event) => {
                        if (
                            !event.currentTarget.contains(event.relatedTarget) &&
                            event.relatedTarget !== trigger.current
                        )
                            setOpen(false);
                    }}
                >
                    <NavLink to="/dashboard" onClick={() => setOpen(false)}>
                        Dashboard
                    </NavLink>
                    <NavLink to="/profile" onClick={() => setOpen(false)}>
                        Profile
                    </NavLink>
                    <Button variant="ghost" busy={busy} onClick={logout}>
                        Log Out
                    </Button>
                    {error && <p role="alert">{error}</p>}
                </div>
                {!compact && (
                    <div className={styles.search}>
                        <SearchBar />
                    </div>
                )}
            </div>
        </nav>
    );
}
