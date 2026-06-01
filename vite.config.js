import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";
// Tauri expects a fixed port and disables the file-watcher polling on the host.
// See https://tauri.app/start/frontend/vite/
const host = process.env.TAURI_DEV_HOST;
export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), "");
    const appMode = env.MODE === "admin" ? "admin" : "player";
    // GitHub Pages serves a project page under /<repo>/; the deploy workflow sets
    // GITHUB_PAGES. Local dev and the Tauri build keep the root base.
    const base = process.env.GITHUB_PAGES ? "/best-wipe/" : "/";
    return {
        base,
        plugins: [react()],
        clearScreen: false,
        define: {
            __APP_MODE__: JSON.stringify(appMode),
        },
        server: {
            port: 1420,
            strictPort: true,
            host: host || false,
            hmr: host ? { protocol: "ws", host, port: 1421 } : undefined,
            watch: {
                ignored: ["**/src-tauri/**"],
            },
        },
    };
});
