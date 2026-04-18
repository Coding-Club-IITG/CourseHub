import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), "");
    const apiBaseUrl = env.VITE_API_BASE_URL || "http://localhost:8080";

    return {
        base: "/admin/",
        plugins: [react(), tailwindcss()],
        resolve: {
            alias: {
                "@": path.resolve(__dirname, "./src"),
            },
        },
        server: {
            port: 5174,
            proxy: {
                "/api": {
                    target: apiBaseUrl,
                    changeOrigin: true,
                },
            },
        },
    };
});
