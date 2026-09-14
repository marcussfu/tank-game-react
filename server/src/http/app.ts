import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { getConnInfo } from '@hono/node-server/conninfo';
import type { Context } from 'hono';
import type { Db } from '../db/index';
import { buildHintPrompt } from '../llm/prompt';
import type { HintClient } from '../llm/hintClient';
import type { EngineSnapshot } from '../../../src/engine/types';
import type { HealthResponse, HintResponse } from '../../../src/net/apiTypes';

export interface HttpDeps {
    db: Db;
    /** Only required if `/hint` is actually called — tests that never hit it
     * can omit this. */
    hintClient?: HintClient;
}

const MAX_NAME = 12;
const MAX_LIMIT = 100;
const MODES = new Set(['solo', 'coop', 'online']);

const HINT_RATE_LIMIT = 10;
const HINT_RATE_WINDOW_MS = 60_000;

const hintClientKey = (c: Context): string => {
    // Per-IP when we can get it; `getConnInfo` throws outside a real Node
    // socket (e.g. Hono's `app.request()` in tests) — fall back to one
    // shared bucket there.
    try {
        return getConnInfo(c).remote.address ?? 'unknown';
    } catch {
        return 'unknown';
    }
};

/**
 * The REST surface, runtime-agnostic (Hono): `/health`, the leaderboard
 * (`POST /scores`, `GET /leaderboard`), and cloud save (`GET|PUT|DELETE
 * /save/:key`), all over the injected `db`. `/hint` (X5) lands here too.
 * Returned as a bare app so tests can hit `createApp(deps).request(...)`
 * without binding a port.
 */
export const createApp = (deps: HttpDeps) => {
    const app = new Hono();
    // This is a local, no-auth hobby server (no deploy in this track — see
    // plan X6), so a simple in-memory bucket per app instance is enough.
    const hintHits = new Map<string, number[]>();
    const withinHintRateLimit = (key: string): boolean => {
        const now = Date.now();
        const recent = (hintHits.get(key) ?? []).filter((t) => now - t < HINT_RATE_WINDOW_MS);
        recent.push(now);
        hintHits.set(key, recent);
        return recent.length <= HINT_RATE_LIMIT;
    };

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

    app.post('/hint', async (c) => {
        if (!withinHintRateLimit(hintClientKey(c))) {
            return c.json({ error: 'rate limit exceeded, try again in a bit' }, 429);
        }
        if (!deps.hintClient) {
            return c.json({ error: 'hint service not configured' }, 503);
        }
        const body = (await c.req.json().catch(() => null)) as { snapshot?: EngineSnapshot } | null;
        if (!body?.snapshot || !Array.isArray(body.snapshot.tiles)) {
            return c.json({ error: 'invalid snapshot' }, 400);
        }
        try {
            const hint = await deps.hintClient.generate(buildHintPrompt(body.snapshot));
            return c.json<HintResponse>({ hint });
        } catch {
            return c.json({ error: 'hint unavailable' }, 502);
        }
    });

    return app;
};

export type App = ReturnType<typeof createApp>;
