import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Db } from '../db/index';
import type { HealthResponse } from '../../../src/net/apiTypes';

export interface HttpDeps {
    db: Db;
}

/**
 * The REST surface, runtime-agnostic (Hono). X2 ships only `GET /health` + CORS;
 * `POST /scores` / `GET /leaderboard` / `/save/:key` land in X3 and `/hint` in
 * X5, all on this same `db`. Returned as a bare app so tests can hit
 * `createApp(deps).request('/health')` without binding a port.
 */
export const createApp = (deps: HttpDeps) => {
    const app = new Hono();

    // Local dev only — the browser app and this server are on different ports.
    app.use('*', cors());

    app.get('/health', (c) => {
        void deps; // deps reserved for the X3/X5 routes
        return c.json<HealthResponse>({ ok: true, ts: Date.now() });
    });

    return app;
};

export type App = ReturnType<typeof createApp>;
