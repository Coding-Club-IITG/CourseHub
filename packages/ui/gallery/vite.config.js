import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
export default defineConfig({
    root: fileURLToPath(new URL(".", import.meta.url)),
    plugins: [react()],
    server: { host: "127.0.0.1", port: 48233, strictPort: true },
    build: { outDir: "../../../~remediation/ui-gallery-dist", emptyOutDir: true },
});
