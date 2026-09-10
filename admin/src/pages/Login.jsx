import { useState } from "react";
import { Brand, Button, FormField } from "@coursehub/ui";
import { adminLogin } from "@/apis/auth";
import styles from "./Login.module.scss";
export default function Login() {
    const [userId, setUserId] = useState(""),
        [password, setPassword] = useState(""),
        [loading, setLoading] = useState(false),
        [error, setError] = useState("");
    const submit = async (event) => {
        event.preventDefault();
        if (loading) return;
        setError("");
        setLoading(true);
        try {
            await adminLogin({ userId, password });
            const requested = new URLSearchParams(window.location.search).get("returnTo");
            const target = new URL(requested || "/admin/", window.location.origin);
            window.location.href =
                target.origin === window.location.origin &&
                target.pathname.startsWith("/admin/") &&
                target.pathname !== "/admin/login"
                    ? target.pathname + target.search + target.hash
                    : "/admin/";
        } catch (failure) {
            setError(failure.message || "Unable to sign in. Please try again.");
        } finally {
            setLoading(false);
        }
    };
    return (
        <main id="admin-content" className={styles.page}>
            <div className={styles.brand}>
                <Brand />
                <p>Administration</p>
            </div>
            <section className={styles.card}>
                <h1>Admin Login</h1>
                <p>Enter your credentials to access the admin panel.</p>
                {error && (
                    <p className={styles.error} role="alert">
                        {error}
                    </p>
                )}
                <form onSubmit={submit}>
                    <FormField label="User ID" required>
                        <input
                            name="username"
                            autoComplete="username"
                            value={userId}
                            onChange={(event) => setUserId(event.target.value)}
                            placeholder="admin id"
                            disabled={loading}
                        />
                    </FormField>
                    <FormField label="Password" required>
                        <input
                            name="password"
                            type="password"
                            autoComplete="current-password"
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            placeholder="••••••••"
                            disabled={loading}
                        />
                    </FormField>
                    <Button type="submit" busy={loading} busyLabel="Signing in...">
                        Sign In
                    </Button>
                </form>
            </section>
        </main>
    );
}
