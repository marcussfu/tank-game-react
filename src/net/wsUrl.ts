/** The multiplayer server URL — `VITE_WS_URL` if set at build time, else the
 * local dev server's default port. Kept in one place so `World` and any
 * future net code agree. */
export const WS_URL: string = import.meta.env.VITE_WS_URL ?? 'ws://localhost:8787';
