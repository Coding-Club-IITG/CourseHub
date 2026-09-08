import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { adminLogin } from "@/apis/auth";

export default function Login() {
    const [userId, setUserId] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const onSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            await adminLogin({ userId, password });
            const requested = new URLSearchParams(window.location.search).get("returnTo");
            const target = new URL(requested || "/admin/", window.location.origin);
            window.location.href = target.origin === window.location.origin && target.pathname.startsWith("/admin/") && target.pathname !== "/admin/login" ? target.pathname + target.search + target.hash : "/admin/";
        } catch (error) {
            setError(error.message || "Unable to sign in. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-6">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/60 p-8 w-full max-w-md">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Admin Login</h1>
                <p className="text-gray-600 mb-6">
                    Enter your credentials to access the admin panel.
                </p>
                {error && <div role="alert" className="mb-4 text-sm text-red-600">{error}</div>}
                <form onSubmit={onSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm text-gray-700 mb-1">User ID</label>
                        <Input
                            value={userId}
                            onChange={(e) => setUserId(e.target.value)}
                            placeholder="admin id"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm text-gray-700 mb-1">Password</label>
                        <Input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                        />
                    </div>
                    <Button
                        type="submit"
                        className="w-full bg-blue-600 hover:bg-blue-700"
                        disabled={loading}
                    >
                        {loading ? "Signing in..." : "Sign In"}
                    </Button>
                </form>
            </div>
        </div>
    );
}
