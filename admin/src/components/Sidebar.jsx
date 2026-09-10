import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { Brand, Button, Dialog, IconButton } from "@coursehub/ui";
import {
    FaBook,
    FaLayerGroup,
    FaLink,
    FaUserGraduate,
    FaExclamationTriangle,
    FaBars,
} from "react-icons/fa";
import { adminLogout } from "@/apis/auth";
import styles from "./Sidebar.module.scss";
const items = [
    ["Operations", "/admin/operations", FaLayerGroup],
    ["Students", "/admin/students", FaUserGraduate],
    ["Courses", "/admin/courses", FaBook],
    ["Course Linking", "/admin/course-linking", FaLink],
    ["Courses Without BR", "/admin/courses-without-br", FaExclamationTriangle],
];
function Navigation({ onNavigate }) {
    const location = useLocation();
    return (
        <nav className={styles.links} aria-label="Administrator navigation">
            {items.map(([label, to, Icon]) => (
                <NavLink
                    key={to}
                    to={label === "Students" && location.pathname === "/admin/" ? "/admin/" : to}
                    className={
                        location.pathname === "/admin/" && label === "Students"
                            ? styles.active
                            : undefined
                    }
                    aria-current={
                        location.pathname === "/admin/" && label === "Students" ? "page" : undefined
                    }
                    onClick={onNavigate}
                >
                    <Icon aria-hidden="true" />
                    <span>{label}</span>
                </NavLink>
            ))}
        </nav>
    );
}
export default function Sidebar() {
    const [open, setOpen] = useState(false),
        [busy, setBusy] = useState(false),
        [error, setError] = useState(""),
        trigger = useRef(null);
    useEffect(() => {
        const media = window.matchMedia("(min-width:1025px)");
        const resize = () => {
            if (media.matches) setOpen(false);
        };
        media.addEventListener("change", resize);
        return () => media.removeEventListener("change", resize);
    }, []);
    const logout = async () => {
        if (busy) return;
        setBusy(true);
        setError("");
        try {
            await adminLogout();
            window.location.href = "/admin/login";
        } catch {
            setError("Could not log out. Please try again.");
        } finally {
            setBusy(false);
        }
    };
    const footer = (
        <div className={styles.footer}>
            {error && <p role="alert">{error}</p>}
            <Button variant="primary" busy={busy} busyLabel="Logging out…" onClick={logout}>
                Logout
            </Button>
        </div>
    );
    return (
        <>
            <aside className={styles.sidebar}>
                <Link className={styles.brand} to="/admin/">
                    <Brand />
                    <small>Administration</small>
                </Link>
                <Navigation />
                {footer}
            </aside>
            <header className={styles.mobile}>
                <Link className={styles.brand} to="/admin/">
                    <Brand />
                </Link>
                <IconButton
                    ref={trigger}
                    label="Open navigation"
                    aria-expanded={open}
                    onClick={() => setOpen(true)}
                >
                    <FaBars />
                </IconButton>
            </header>
            <Dialog
                open={open}
                onOpenChange={setOpen}
                title="Navigation"
                className={styles.drawer}
                bodyClassName={styles.drawerBody}
                footer={footer}
                busy={busy}
                returnFocusRef={trigger}
            >
                <Navigation onNavigate={() => setOpen(false)} />
            </Dialog>
        </>
    );
}
