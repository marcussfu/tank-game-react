/// <reference types="vite/client" />

interface ImportMetaEnv {
    /** WebSocket URL of the multiplayer server. Defaults to
     * `ws://localhost:8788/ws` when unset (WS shares the REST API's port). */
    readonly VITE_WS_URL?: string;
    /** Base URL of the REST API (leaderboard / cloud-save / hint proxy).
     * Defaults to `http://localhost:8788` when unset. */
    readonly VITE_API_URL?: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
