import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Db } from '../db/index';
import type { HealthResponse } from '../../../src/net/apiTypes';

export interface HttpDeps {
    db: Db;
}

const MAX_NAME = 12;
const MAX_LIMIT = 100;
const MODES = new Set(['solo', 'coop', 'online']);

/**
 * The REST surface, runtime-agnostic (Hono): `/health`, the leaderboard
 * (`POST /scores`, `GET /leaderboard`), and cloud save (`GET|PUT|DELETE
 * /save/:key`), all over the injected `db`. `/hint` (X5) lands here too.
 * Returned as a bare app so tests can hit `createApp(deps).request(...)`
 * without binding a port.
 */
export const createApp = (deps: HttpDeps) => {
    const app = new Hono();

    // Local dev only — the browser app and this server are on different ports.
    app.use('*', cors());

    app.get('/health', (c) => c.json<HealthResponse>({ ok: true, ts: Date.now() }));

    app.post('/scores', async (c) => {
        const body = (await c.req.json().catch(() => null)) as Record<string, unknown> | null;
        const name = typeof body?.name === 'string' ? body.name.trim().slice(0, MAX_NAME) : '';
        const score = Number(body?.score);
        const level = Number(body?.level);
        const mode = typeof body?.mode === 'string' && MODES.has(body.mode) ? body.mode : 'solo';

        if (!name || !Number.isFinite(score) || score < 0 || !Number.isInteger(level) || level < 1) {
            return c.json({ error: 'invalid score payload' }, 400);
        }
        return c.json(await deps.db.addScore({ name, score: Math.round(score), level, mode }), 201);
    });

    app.get('/leaderboard', async (c) => {
        const limit = Math.min(Math.max(Number(c.req.query('limit')) || 20, 1), MAX_LIMIT);
        const mode = c.req.query('mode');
        return c.json(await deps.db.listScores({ limit, mode: mode || undefined }));
    });

    app.get('/save/:key', async (c) => {
        const row = await deps.db.getSave(c.req.param('key'));
        return row ? c.json(row) : c.json({ error: 'no save' }, 404);
    });

    app.put('/save/:key', async (c) => {
        const body = (await c.req.json().catch(() => null)) as Record<string, unknown> | null;
        const levelIndex = Number(body?.levelIndex);
        const lives = Number(body?.lives);
        const score = Number(body?.score);
        if (![levelIndex, lives, score].every((n) => Number.isFinite(n) && n >= 0)) {
            return c.json({ error: 'invalid save payload' }, 400);
        }
        return c.json(await deps.db.putSave(c.req.param('key'), {
            levelIndex: Math.trunc(levelIndex),
            lives: Math.trunc(lives),
            score: Math.round(score),
        }));
    });

    app.delete('/save/:key', async (c) => {
        await deps.db.deleteSave(c.req.param('key'));
        return c.body(null, 204);
    });

    return app;
};

export type App = ReturnType<typeof createApp>;
