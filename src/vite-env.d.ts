/// <reference types="vite/client" />

interface ImportMetaEnv {
    /** WebSocket URL of the multiplayer server. Defaults to
     * `ws://localhost:8787` when unset. */
    readonly VITE_WS_URL?: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
